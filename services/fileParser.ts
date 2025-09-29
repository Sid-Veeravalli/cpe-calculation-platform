import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { Slide, SourceType } from '../types';

const findColumn = (header: string[], potentialNames: string[]): number => {
    for (const name of potentialNames) {
        const index = header.findIndex(h => h.toLowerCase().trim() === name.toLowerCase());
        if (index !== -1) return index;
    }
    return -1;
};

const createSlideObject = (id: number, ost: string, transcript: string): Slide => ({
    id,
    ost,
    transcript,
    selectedSource: SourceType.OST,
    audioDuration: 0,
    isFinalized: false,
    audioMeta: { source: 'manual' },
    isDiscarded: false,
});

const parseXlsx = (file: File): Promise<Slide[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (json.length < 2) {
                    resolve([]);
                    return;
                }

                const header = json[0].map(h => String(h));
                const ostIndex = findColumn(header, ['ost', 'on-screen text']);
                const transcriptIndex = findColumn(header, ['transcript', 'audio']);
                const slideNoIndex = findColumn(header, ['slide no', 'slide #', 'slideno', 'slide number']);

                if (ostIndex === -1 && transcriptIndex === -1) {
                    throw new Error('Could not find "OST" or "Transcript" columns in the Excel file.');
                }

                const dataRows = json.slice(1);

                const slides: Slide[] = dataRows
                    .filter(row => { // Keep row if it has a valid Slide #, or fallback to content check
                        if (slideNoIndex !== -1) {
                            const idFromCell = parseInt(String(row[slideNoIndex] || ''), 10);
                            return !isNaN(idFromCell) && idFromCell > 0;
                        }
                        const ostContent = ostIndex !== -1 ? String(row[ostIndex] || '').trim() : '';
                        const transcriptContent = transcriptIndex !== -1 ? String(row[transcriptIndex] || '').trim() : '';
                        return ostContent.length > 0 || transcriptContent.length > 0;
                    })
                    .map((row, index) => {
                        let slideId = index + 1;
                        if (slideNoIndex !== -1) {
                            const idFromCell = parseInt(String(row[slideNoIndex] || ''), 10);
                            if (!isNaN(idFromCell) && idFromCell > 0) {
                                slideId = idFromCell;
                            }
                        }
                        
                        return createSlideObject(
                            slideId,
                            ostIndex !== -1 ? String(row[ostIndex] || '') : '',
                            transcriptIndex !== -1 ? String(row[transcriptIndex] || '') : '',
                        );
                    });
                resolve(slides);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

const parseCsv = (file: File): Promise<Slide[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const header = results.meta.fields?.map(h => String(h)) || [];
                const ostKey = header.find(h => ['ost', 'on-screen text'].includes(h.toLowerCase().trim()));
                const transcriptKey = header.find(h => ['transcript', 'audio'].includes(h.toLowerCase().trim()));
                const slideNoKey = header.find(h => ['slide no', 'slide #', 'slideno', 'slide number'].includes(h.toLowerCase().trim()));

                if (!ostKey && !transcriptKey) {
                    reject(new Error('Could not find "OST" or "Transcript" columns in the CSV file.'));
                    return;
                }

                const slides: Slide[] = (results.data as any[])
                    .filter(row => { // Keep row if it has a valid Slide #, or fallback to content check
                        if (slideNoKey) {
                            const idFromCell = parseInt(String(row[slideNoKey] || ''), 10);
                            return !isNaN(idFromCell) && idFromCell > 0;
                        }
                        const ostContent = ostKey ? String(row[ostKey] || '').trim() : '';
                        const transcriptContent = transcriptKey ? String(row[transcriptKey] || '').trim() : '';
                        return ostContent.length > 0 || transcriptContent.length > 0;
                    })
                    .map((row, index) => {
                        let slideId = index + 1;
                        if (slideNoKey) {
                            const idFromCell = parseInt(String(row[slideNoKey] || ''), 10);
                            if (!isNaN(idFromCell) && idFromCell > 0) {
                                slideId = idFromCell;
                            }
                        }
                        
                        return createSlideObject(
                            slideId,
                            ostKey ? row[ostKey] || '' : '',
                            transcriptKey ? row[transcriptKey] || '' : '',
                        );
                    });
                resolve(slides);
            },
            error: (error) => reject(error),
        });
    });
};

const parsePptx = async (file: File): Promise<Slide[]> => {
    const zip = await JSZip.loadAsync(file);
    const parser = new DOMParser();

    const slidePromises = Object.keys(zip.files)
        .filter(name => name.startsWith('ppt/slides/slide') && !name.includes('_rels'))
        .map(async (slidePath) => {
            const slideNumberMatch = slidePath.match(/slide(\d+)\.xml$/);
            if (!slideNumberMatch) return null;
            
            const slideId = parseInt(slideNumberMatch[1], 10);
            const slideXmlStr = await zip.file(slidePath)?.async('string');
            if (!slideXmlStr) return null;

            const slideXml = parser.parseFromString(slideXmlStr, 'application/xml');
            const ostNodes = slideXml.getElementsByTagName('a:t');
            let ost = Array.from(ostNodes).map(node => node.textContent).join(' ');

            let transcript = '';
            const relsPath = `ppt/slides/_rels/slide${slideId}.xml.rels`;
            const relsFile = zip.file(relsPath);
            if(relsFile) {
                const relsXmlStr = await relsFile.async('string');
                const relsXml = parser.parseFromString(relsXmlStr, 'application/xml');
                const noteRel = Array.from(relsXml.getElementsByTagName('Relationship')).find(
                    rel => rel.getAttribute('Type')?.endsWith('/notesSlide')
                );
                if(noteRel) {
                    const noteTargetPath = noteRel.getAttribute('Target')?.replace('..', 'ppt');
                     if(noteTargetPath) {
                        const noteXmlStr = await zip.file(noteTargetPath)?.async('string');
                        if (noteXmlStr) {
                            const noteXml = parser.parseFromString(noteXmlStr, 'application/xml');
                            const transcriptNodes = noteXml.getElementsByTagName('a:t');
                            transcript = Array.from(transcriptNodes).map(node => node.textContent).join(' ');
                        }
                    }
                }
            }

            // Create a temporary object for sorting
            return {
                _sortId: slideId,
                ost: ost.trim(),
                transcript: transcript.trim(),
            };
        });
    
    const resolvedSlidesData = (await Promise.all(slidePromises)).filter(Boolean);
    resolvedSlidesData.sort((a, b) => a!._sortId - b!._sortId);
    
    // Create final Slide objects with sequential IDs
    return resolvedSlidesData.map((data, index) => createSlideObject(
        index + 1,
        data!.ost,
        data!.transcript
    ));
};


export const parseFile = (file: File): Promise<Slide[]> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'xlsx':
        case 'xls':
            return parseXlsx(file);
        case 'csv':
            return parseCsv(file);
        case 'pptx':
            return parsePptx(file);
        default:
            return Promise.reject(new Error('Unsupported file type. Please upload an Excel, CSV, or PPTX file.'));
    }
};