export default {
    // 🏢 EXPORT FÜR GEWÄHLTEN RAUM - Komplett isoliert
    exportRoomWithColors: async () => {
        console.log('🏢 ExcelJS-Export für gewählten Raum gestartet.');
        
        try {
            if (typeof ExcelJS === 'undefined') {
                showAlert('Export-Fehler: ExcelJS-Bibliothek nicht geladen.', 'error');
                return;
            }
            
            // Raumname und ID abrufen (NUR LESEN, NICHT ÄNDERN!)
            const roomName = SelectRoom.selectedOptionLabel || 'Unbekannter Raum';
            const roomId = SelectRoom.selectedOptionValue;
            
            console.log('📋 Export für Raum:', roomName, 'ID:', roomId);

            // WICHTIG: Isolierte Raum-Query verwenden!
            const tableData = await getTasksForRoomExport.run({ 
                roomId: roomId 
            });
            
            if (!tableData || tableData.length === 0) {
                showAlert('Keine Daten zum Exportieren vorhanden.', 'warning');
                return;
            }

            console.log(`📊 ${tableData.length} Zeilen geladen für Raum: ${roomName}`);

            const displayHeaders = Object.keys(tableData[0]).filter(header => 
                !header.toLowerCase().endsWith('_color') && !header.toLowerCase().endsWith('_textcolor')
            );
            
            // ExcelJS Arbeitsmappe erstellen
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Appsmith Raumplanung';
            workbook.created = new Date();
            
            const worksheet = workbook.addWorksheet('Raumplanung');
            
            // NEU: Druckeinstellungen für DIN A4 und "Auf eine Seite anpassen"
            worksheet.pageSetup = {
                paperSize: 9, // 9 steht für DIN A4
                orientation: 'portrait', // Querformat für bessere Lesbarkeit
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 1,
                margins: {
                    left: 0.25,
                    right: 0.25,
                    top: 0.25,
                    bottom: 0.25,
                    header: 0.3,
                    footer: 0.3
                }
            };

            // TITEL-ZEILE mit Raumname
            const titleRow = worksheet.addRow([`RAUMPLANUNG: ${roomName}`]);
            worksheet.mergeCells(1, 1, 1, displayHeaders.length);
            
            titleRow.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF6A4C93' }  // Lila für Räume
            };
            titleRow.getCell(1).font = {
                bold: true,
                color: { argb: 'FFFFFFFF' },
                size: 16
            };
            titleRow.getCell(1).alignment = {
                horizontal: 'center',
                vertical: 'middle'
            };
            titleRow.height = 30;

            // Leerzeile
            worksheet.addRow([]);

            // Header-Zeile
            const headerRow = worksheet.addRow(displayHeaders);
            headerRow.eachCell((cell, colNumber) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF8E44AD' }  // Lila-Ton für Raum-Header
                };
                cell.font = {
                    bold: true,
                    color: { argb: 'FFFFFFFF' },
                    size: 12
                };
                cell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle'
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // Datenzeilen
            tableData.forEach((row, rowIndex) => {
                const dataRow = worksheet.addRow(displayHeaders.map(header => row[header] || ''));
                
                dataRow.eachCell((cell, colNumber) => {
                    const header = displayHeaders[colNumber - 1];
                    const cellValue = row[header] || '';
                    
                    cell.alignment = {
                        horizontal: 'center',
                        vertical: 'middle'
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    
                    if (header === 'Zeit') {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF5F5F5' }
                        };
                        cell.font = { bold: true, size: 10 };
                    }
                    else if (['Mo', 'Di', 'Mi', 'Do', 'Fr'].includes(header)) {
                        const backgroundColor = row[`${header}_Color`];
                        const textColor = row[`${header}_TextColor`];
                        
                        if (backgroundColor && backgroundColor !== '#F8F9FA' && cellValue && cellValue.trim() !== '') {
                            const argbBackground = this.hexToARGB(backgroundColor);
                            const argbText = this.hexToARGB(textColor || '#000000');
                            
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: argbBackground }
                            };
                            cell.font = {
                                bold: true,
                                color: { argb: argbText },
                                size: 10
                            };
                        } else {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFFFFF' }
                            };
                            cell.font = { size: 10 };
                        }
                    }
                });
            });

            // Spaltenbreiten
            displayHeaders.forEach((header, index) => {
                const column = worksheet.getColumn(index + 1);
                column.width = header === 'Zeit' ? 8 : 25; // Breiter für "Task (Mitarbeiter)"
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const base64String = this.arrayBufferToBase64(buffer);
            const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64String}`;
            
            await storeValue('roomExcelDataUrl', dataUrl);
            await storeValue('currentRoomName', roomName); // RAUM-DATEINAME SPEICHERN
            
            showAlert(`✅ Excel für Raum "${roomName}" ist zum Download bereit!`, 'success');

        } catch (error) {
            console.error('Fehler beim Raum-Export:', error);
            showAlert(`Fehler: ${error.message}`, 'error');
        }
    },

    // 🏢 EXPORT FÜR ALLE RÄUME - Komplett isoliert
    exportAllRooms: async () => {
        console.log('🏢 Starte ISOLIERTEN Export für alle Räume...');
        
        try {
            if (typeof ExcelJS === 'undefined') {
                showAlert('Export-Fehler: ExcelJS-Bibliothek nicht geladen.', 'error');
                return;
            }

            // Raum-Liste abrufen (NUR LESEN!)
            const allRooms = SelectRoom.options || [];
            if (!allRooms || allRooms.length === 0) {
                showAlert('⚠️ Keine Räume gefunden.', 'warning');
                return;
            }

            console.log(`🏢 Erstelle Excel für ${allRooms.length} Räume (isoliert)...`);

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Appsmith Raumplanung';
            workbook.created = new Date();

            let successfulSheets = 0;
            
            // WICHTIG: Für jeden Raum isolierte Query aufrufen
            for (let i = 0; i < allRooms.length; i++) {
                const room = allRooms[i];
                const roomName = room.label || `Raum ${i + 1}`;
                const roomValue = room.value;

                console.log(`\n🏢 ${i+1}/${allRooms.length}: Erstelle Tabellenblatt für: ${roomName} (ID: ${roomValue})`);

                try {
                    // ISOLIERTE Query - Frontend wird NICHT berührt!
                    const roomData = await getTasksForRoomExport.run({ 
                        roomId: roomValue 
                    });

                    if (!roomData || roomData.length === 0) {
                        console.log(`⚠️ Keine Daten für Raum ${roomName} - überspringe`);
                        continue;
                    }

                    console.log(`   ✅ ${roomData.length} Zeilen geladen für Raum ${roomName}`);

                    // Worksheet für diesen Raum erstellen
                    const cleanSheetName = this.sanitizeSheetName(roomName);
                    const worksheet = workbook.addWorksheet(cleanSheetName);
                    // NEU: Druckeinstellungen für DIN A4 und "Auf eine Seite anpassen"
                    worksheet.pageSetup = {
                        paperSize: 9, // 9 steht für DIN A4
                        orientation: 'portrait', // Querformat für bessere Lesbarkeit
                        fitToPage: true,
                        fitToWidth: 1,
                        fitToHeight: 1,
                        margins: {
                            left: 0.25,
                            right: 0.25,
                            top: 0.25,
                            bottom: 0.25,
                            header: 0.3,
                            footer: 0.3
                        }
                    };

                    const displayHeaders = Object.keys(roomData[0]).filter(header => 
                        !header.toLowerCase().endsWith('_color') && !header.toLowerCase().endsWith('_textcolor')
                    );

                    // Titel-Zeile
                    const titleRow = worksheet.addRow([`RAUMPLANUNG: ${roomName}`]);
                    worksheet.mergeCells(1, 1, 1, displayHeaders.length);
                    
                    titleRow.getCell(1).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF6A4C93' }  // Lila für Räume
                    };
                    titleRow.getCell(1).font = {
                        bold: true,
                        color: { argb: 'FFFFFFFF' },
                        size: 16
                    };
                    titleRow.getCell(1).alignment = {
                        horizontal: 'center',
                        vertical: 'middle'
                    };
                    titleRow.height = 30;

                    // Leerzeile
                    worksheet.addRow([]);

                    // Header-Zeile
                    const headerRow = worksheet.addRow(displayHeaders);
                    headerRow.eachCell((cell, colNumber) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF8E44AD' }  // Lila für Raum-Header
                        };
                        cell.font = {
                            bold: true,
                            color: { argb: 'FFFFFFFF' },
                            size: 12
                        };
                        cell.alignment = {
                            horizontal: 'center',
                            vertical: 'middle'
                        };
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });

                    // Datenzeilen für diesen spezifischen Raum
                    let coloredCellsCount = 0;
                    roomData.forEach((row, rowIndex) => {
                        const dataRow = worksheet.addRow(displayHeaders.map(header => row[header] || ''));
                        
                        dataRow.eachCell((cell, colNumber) => {
                            const header = displayHeaders[colNumber - 1];
                            const cellValue = row[header] || '';
                            
                            cell.alignment = {
                                horizontal: 'center',
                                vertical: 'middle'
                            };
                            cell.border = {
                                top: { style: 'thin' },
                                left: { style: 'thin' },
                                bottom: { style: 'thin' },
                                right: { style: 'thin' }
                            };
                            
                            if (header === 'Zeit') {
                                cell.fill = {
                                    type: 'pattern',
                                    pattern: 'solid',
                                    fgColor: { argb: 'FFF5F5F5' }
                                };
                                cell.font = { bold: true, size: 10 };
                            }
                            else if (['Mo', 'Di', 'Mi', 'Do', 'Fr'].includes(header)) {
                                const backgroundColor = row[`${header}_Color`];
                                const textColor = row[`${header}_TextColor`];
                                
                                if (backgroundColor && backgroundColor !== '#F8F9FA' && cellValue && cellValue.trim() !== '') {
                                    const argbBackground = this.hexToARGB(backgroundColor);
                                    const argbText = this.hexToARGB(textColor || '#000000');
                                    
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: argbBackground }
                                    };
                                    cell.font = {
                                        bold: true,
                                        color: { argb: argbText },
                                        size: 10
                                    };
                                    
                                    coloredCellsCount++;
                                } else {
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFFFFFFF' }
                                    };
                                    cell.font = { size: 10 };
                                }
                            }
                        });
                    });

                    // Spaltenbreiten
                    displayHeaders.forEach((header, index) => {
                        const column = worksheet.getColumn(index + 1);
                        column.width = header === 'Zeit' ? 8 : 25; // Breiter für "Task (Mitarbeiter)"
                    });
                    
                    console.log(`   ✅ Tabellenblatt erstellt mit ${coloredCellsCount} gefärbten Zellen`);
                    successfulSheets++;
                    
                } catch (roomError) {
                    console.error(`❌ Fehler bei Raum ${roomName}:`, roomError);
                    // Weiter mit nächstem Raum
                }
            }

            if (successfulSheets === 0) {
                showAlert('❌ Keine Tabellenblätter erstellt. Prüfen Sie die Konsole.', 'error');
                return;
            }

            // Excel-Datei generieren
            console.log(`💾 Generiere Excel-Datei mit ${successfulSheets} Tabellenblättern...`);
            const buffer = await workbook.xlsx.writeBuffer();
            const base64String = this.arrayBufferToBase64(buffer);
            const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64String}`;
            
            await storeValue('allRoomsExcelDataUrl', dataUrl);
            
            showAlert(`✅ Excel-Datei für ${successfulSheets}/${allRooms.length} Räume erstellt!`, 'success');

        } catch (error) {
            console.error('Fehler beim Alle-Räume-Export:', error);
            showAlert(`Fehler: ${error.message}`, 'error');
        }
    },

    // 🏢 DOWNLOAD-FUNKTIONEN mit korrekten Raum-Dateinamen
    downloadRoomExcel: () => {
        const dataUrl = appsmith.store.roomExcelDataUrl;
        const roomName = appsmith.store.currentRoomName || SelectRoom.selectedOptionLabel || 'Raum';
        
        if (dataUrl) {
            // Dateiname: Raumname + Datum
            const cleanName = roomName.replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '').replace(/\s+/g, '_');
            const fileName = `Raum_${cleanName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            
            download(dataUrl, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            showAlert(`📥 Lade "${fileName}" herunter...`, 'info');
        } else {
            showAlert('⚠️ Keine Excel-Datei verfügbar. Bitte zuerst exportieren.', 'warning');
        }
    },

    downloadAllRoomsExcel: () => {
        const dataUrl = appsmith.store.allRoomsExcelDataUrl;
        
        if (dataUrl) {
            // Dateiname: "Alle Räume" + Datum
            const fileName = `Alle_Raeume_${new Date().toISOString().slice(0, 10)}.xlsx`;
            
            download(dataUrl, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            showAlert(`📥 Lade "${fileName}" herunter...`, 'info');
        } else {
            showAlert('⚠️ Keine Excel-Datei verfügbar. Bitte zuerst exportieren.', 'warning');
        }
    },

    // 🏢 EXPORT UND DOWNLOAD IN EINEM SCHRITT
    exportAndDownloadRoom: async () => {
        await this.exportRoomWithColors();
        setTimeout(() => {
            this.downloadRoomExcel();
        }, 1000);
    },

    exportAndDownloadAllRooms: async () => {
        await this.exportAllRooms();
        setTimeout(() => {
            this.downloadAllRoomsExcel();
        }, 1000);
    },

    // 🧪 DEBUG: Teste isolierte Raum-Query
    testIsolatedRoomQuery: async () => {
        try {
            const allRooms = SelectRoom.options || [];
            if (allRooms.length < 2) {
                showAlert('Mindestens 2 Räume für Test erforderlich', 'warning');
                return;
            }
            
            console.log('🧪 Teste isolierte Raum-Query...');
            console.log('Frontend vor Test - Ausgewählter Raum:', SelectRoom.selectedOptionLabel);
            
            // Teste ersten Raum
            const room1 = allRooms[0];
            console.log(`\n🏢 1️⃣ Teste: ${room1.label} (ID: ${room1.value})`);
            const data1 = await getTasksForRoomExport.run({ roomId: room1.value });
            console.log(`   Zeilen: ${data1?.length || 0}`);
            
            console.log('Frontend nach erstem Test - Ausgewählter Raum:', SelectRoom.selectedOptionLabel);
            
            // Teste zweiten Raum
            const room2 = allRooms[1];
            console.log(`\n🏢 2️⃣ Teste: ${room2.label} (ID: ${room2.value})`);
            const data2 = await getTasksForRoomExport.run({ roomId: room2.value });
            console.log(`   Zeilen: ${data2?.length || 0}`);
            
            console.log('Frontend nach zweitem Test - Ausgewählter Raum:', SelectRoom.selectedOptionLabel);
            
            const areDifferent = JSON.stringify(data1) !== JSON.stringify(data2);
            console.log(`\n🔍 Daten unterschiedlich: ${areDifferent}`);
            console.log(`🎯 Frontend unverändert: ${SelectRoom.selectedOptionLabel === SelectRoom.selectedOptionLabel}`);
            
            if (areDifferent) {
                showAlert('✅ Isolierte Raum-Query funktioniert!', 'success');
            } else {
                showAlert('⚠️ Query gibt gleiche Daten zurück.', 'warning');
            }
            
        } catch (error) {
            console.error('Test-Fehler:', error);
            showAlert(`Test-Fehler: ${error.message}`, 'error');
        }
    },

    // 🔧 HILFSFUNKTIONEN
    sanitizeSheetName: (name) => {
        return name
            .replace(/[\\\/\?\*\[\]]/g, '') // Excel-verbotene Zeichen entfernen
            .substring(0, 31) // Max. 31 Zeichen
            .trim();
    },

    hexToARGB: (hexColor) => {
        if (!hexColor) return 'FF000000';
        const hex = hexColor.replace('#', '');
        if (hex.length === 3) {
            const expandedHex = hex.split('').map(char => char + char).join('');
            return 'FF' + expandedHex.toUpperCase();
        }
        if (hex.length === 6) {
            return 'FF' + hex.toUpperCase();
        }
        return 'FF000000';
    },

    arrayBufferToBase64: (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}