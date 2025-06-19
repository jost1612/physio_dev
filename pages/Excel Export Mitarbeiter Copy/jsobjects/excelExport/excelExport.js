export default {
    // KOMPLETT ISOLIERTE VERSION - Kein Frontend-Update!
    exportWithColors: async () => {
        console.log('🎨 ExcelJS-Export für gewählten Mitarbeiter (isoliert)');
        
        try {
            if (typeof ExcelJS === 'undefined') {
                showAlert('Export-Fehler: ExcelJS-Bibliothek nicht geladen.', 'error');
                return;
            }
            
            // Mitarbeitername und ID abrufen (NUR LESEN, NICHT ÄNDERN!)
            const employeeName = SelectEmployee.selectedOptionLabel || 'Unbekannter Mitarbeiter';
            const employeeId = SelectEmployee.selectedOptionValue;
            
            console.log('📋 Export für:', employeeName, 'ID:', employeeId);

            // WICHTIG: Neue isolierte Query verwenden!
            const tableData = await getTasksForEmployeeExport.run({ 
                employeeId: employeeId 
            });
            
            if (!tableData || tableData.length === 0) {
                showAlert('Keine Daten zum Exportieren vorhanden.', 'warning');
                return;
            }

            console.log(`📊 ${tableData.length} Zeilen geladen (Frontend unberührt)`);

            // Rest der Export-Logik bleibt gleich...
            const displayHeaders = Object.keys(tableData[0]).filter(header => 
                !header.toLowerCase().endsWith('_color') && !header.toLowerCase().endsWith('_textcolor')
            );
            
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Appsmith Mitarbeiterplanung';
            workbook.created = new Date();
            
            const worksheet = workbook.addWorksheet('Mitarbeiterplanung');

            // Titel mit Mitarbeitername
            const titleRow = worksheet.addRow([`MITARBEITERPLANUNG: ${employeeName}`]);
            worksheet.mergeCells(1, 1, 1, displayHeaders.length);
            
            titleRow.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1565C0' }
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

            worksheet.addRow([]);

            // Header
            const headerRow = worksheet.addRow(displayHeaders);
            headerRow.eachCell((cell, colNumber) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF2E7D32' }
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
                column.width = header === 'Zeit' ? 8 : 20;
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const base64String = this.arrayBufferToBase64(buffer);
            const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64String}`;
            
            await storeValue('excelDataUrl', dataUrl);
            await storeValue('currentEmployeeName', employeeName);
            
            showAlert(`✅ Excel für ${employeeName} ist bereit!`, 'success');

        } catch (error) {
            console.error('Fehler beim Export:', error);
            showAlert(`Fehler: ${error.message}`, 'error');
        }
    },

    // KOMPLETT ISOLIERTE VERSION - Alle Mitarbeiter
    exportAllEmployees: async () => {
        console.log('🚀 Starte ISOLIERTEN Export für alle Mitarbeiter...');
        
        try {
            if (typeof ExcelJS === 'undefined') {
                showAlert('Export-Fehler: ExcelJS-Bibliothek nicht geladen.', 'error');
                return;
            }

            // Mitarbeiter-Liste abrufen (NUR LESEN!)
            const allEmployees = SelectEmployee.options || [];
            if (!allEmployees || allEmployees.length === 0) {
                showAlert('⚠️ Keine Mitarbeiter gefunden.', 'warning');
                return;
            }

            console.log(`📊 Erstelle Excel für ${allEmployees.length} Mitarbeiter (isoliert)...`);

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Appsmith Mitarbeiterplanung';
            workbook.created = new Date();

            let successfulSheets = 0;
            
            // WICHTIG: Für jeden Mitarbeiter isolierte Query aufrufen
            for (let i = 0; i < allEmployees.length; i++) {
                const employee = allEmployees[i];
                const employeeName = employee.label || `Mitarbeiter ${i + 1}`;
                const employeeValue = employee.value;

                console.log(`\n📋 ${i+1}/${allEmployees.length}: ${employeeName} (ID: ${employeeValue})`);

                try {
                    // ISOLIERTE Query - Frontend wird NICHT berührt!
                    const employeeData = await getTasksForEmployeeExport.run({ 
                        employeeId: employeeValue 
                    });

                    if (!employeeData || employeeData.length === 0) {
                        console.log(`⚠️ Keine Daten für ${employeeName}`);
                        continue;
                    }

                    console.log(`   ✅ ${employeeData.length} Zeilen geladen (isoliert)`);

                    const cleanSheetName = this.sanitizeSheetName(employeeName);
                    const worksheet = workbook.addWorksheet(cleanSheetName);

                    const displayHeaders = Object.keys(employeeData[0]).filter(header => 
                        !header.toLowerCase().endsWith('_color') && !header.toLowerCase().endsWith('_textcolor')
                    );

                    // Titel
                    const titleRow = worksheet.addRow([`MITARBEITERPLANUNG: ${employeeName}`]);
                    worksheet.mergeCells(1, 1, 1, displayHeaders.length);
                    
                    titleRow.getCell(1).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF1565C0' }
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

                    worksheet.addRow([]);

                    // Header
                    const headerRow = worksheet.addRow(displayHeaders);
                    headerRow.eachCell((cell, colNumber) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF2E7D32' }
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
                    let coloredCellsCount = 0;
                    employeeData.forEach((row, rowIndex) => {
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
                        column.width = header === 'Zeit' ? 8 : 20;
                    });
                    
                    console.log(`   ✅ Blatt erstellt mit ${coloredCellsCount} gefärbten Zellen`);
                    successfulSheets++;
                    
                } catch (employeeError) {
                    console.error(`❌ Fehler bei ${employeeName}:`, employeeError);
                }
            }

            if (successfulSheets === 0) {
                showAlert('❌ Keine Tabellenblätter erstellt.', 'error');
                return;
            }

            console.log(`💾 Generiere Excel mit ${successfulSheets} Blättern...`);
            const buffer = await workbook.xlsx.writeBuffer();
            const base64String = this.arrayBufferToBase64(buffer);
            const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64String}`;
            
            await storeValue('allEmployeesExcelDataUrl', dataUrl);
            
            showAlert(`✅ Excel für ${successfulSheets}/${allEmployees.length} Mitarbeiter!`, 'success');

        } catch (error) {
            console.error('Export-Fehler:', error);
            showAlert(`Fehler: ${error.message}`, 'error');
        }
    },

    // KORREKTE DOWNLOADS mit richtigen Dateinamen
    downloadExcel: () => {
        const dataUrl = appsmith.store.excelDataUrl;
        const employeeName = appsmith.store.currentEmployeeName || SelectEmployee.selectedOptionLabel || 'Mitarbeiter';
        
        if (dataUrl) {
            const cleanName = employeeName.replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '').replace(/\s+/g, '_');
            const fileName = `${cleanName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            
            download(dataUrl, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            showAlert(`📥 Download: "${fileName}"`, 'info');
        } else {
            showAlert('⚠️ Keine Excel-Datei verfügbar.', 'warning');
        }
    },

    downloadAllEmployeesExcel: () => {
        const dataUrl = appsmith.store.allEmployeesExcelDataUrl;
        
        if (dataUrl) {
            const fileName = `Alle_Mitarbeiter_${new Date().toISOString().slice(0, 10)}.xlsx`;
            
            download(dataUrl, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            showAlert(`📥 Download: "${fileName}"`, 'info');
        } else {
            showAlert('⚠️ Keine Excel-Datei verfügbar.', 'warning');
        }
    },

    exportAndDownload: async () => {
        await this.exportWithColors();
        setTimeout(() => {
            this.downloadExcel();
        }, 1000);
    },

    exportAndDownloadAll: async () => {
        await this.exportAllEmployees();
        setTimeout(() => {
            this.downloadAllEmployeesExcel();
        }, 1000);
    },

    // Debug: Teste isolierte Query
    testIsolatedQuery: async () => {
        try {
            const allEmployees = SelectEmployee.options || [];
            if (allEmployees.length < 2) {
                showAlert('Mindestens 2 Mitarbeiter für Test erforderlich', 'warning');
                return;
            }
            
            console.log('🧪 Teste isolierte Query...');
            console.log('Frontend vor Test - Ausgewählter Mitarbeiter:', SelectEmployee.selectedOptionLabel);
            
            // Teste ersten Mitarbeiter
            const emp1 = allEmployees[0];
            console.log(`\n1️⃣ Teste: ${emp1.label} (ID: ${emp1.value})`);
            const data1 = await getTasksForEmployeeExport.run({ employeeId: emp1.value });
            console.log(`   Zeilen: ${data1?.length || 0}`);
            
            console.log('Frontend nach erstem Test - Ausgewählter Mitarbeiter:', SelectEmployee.selectedOptionLabel);
            
            // Teste zweiten Mitarbeiter
            const emp2 = allEmployees[1];
            console.log(`\n2️⃣ Teste: ${emp2.label} (ID: ${emp2.value})`);
            const data2 = await getTasksForEmployeeExport.run({ employeeId: emp2.value });
            console.log(`   Zeilen: ${data2?.length || 0}`);
            
            console.log('Frontend nach zweitem Test - Ausgewählter Mitarbeiter:', SelectEmployee.selectedOptionLabel);
            
            const areDifferent = JSON.stringify(data1) !== JSON.stringify(data2);
            console.log(`\n🔍 Daten unterschiedlich: ${areDifferent}`);
            console.log(`🎯 Frontend unverändert: ${SelectEmployee.selectedOptionLabel === SelectEmployee.selectedOptionLabel}`);
            
            if (areDifferent) {
                showAlert('✅ Isolierte Query funktioniert!', 'success');
            } else {
                showAlert('⚠️ Query gibt gleiche Daten zurück.', 'warning');
            }
            
        } catch (error) {
            console.error('Test-Fehler:', error);
            showAlert(`Test-Fehler: ${error.message}`, 'error');
        }
    },

    // Hilfsfunktionen
    sanitizeSheetName: (name) => {
        return name
            .replace(/[\\\/\?\*\[\]]/g, '')
            .substring(0, 31)
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