export default {
  saveRoom: async () => {
    try {
      console.log('Starting save room...');
      
      // Warte kurz, damit lastSaveData ankommt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const payload = RoomPlanningWidget.model.lastSaveData || {};
      console.log("🔍 payload:", payload);
      
      const newGridState = payload.gridState || {};
      
      if (!newGridState || Object.keys(newGridState).length === 0) {
        showAlert('Keine neuen Termine zum Speichern!', 'info');
        return;
      }
      
      const tasks = getTasks.data || [];
      let savedCount = 0;
      
      // Für jeden neuen Eintrag speichern
      for (const [key, cellData] of Object.entries(newGridState)) {
        if (!cellData?.root || cellData.existing) continue;
        
        console.log("→ Neuer Eintrag:", key, cellData);
        const [dayAbbrev, startTime] = key.split("-");
        
        // Endzeit berechnen
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + (cellData.duration_minutes || 60);
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
        
        // Datum berechnen
        const today = new Date();
        const dayIndex = ["Mo", "Di", "Mi", "Do", "Fr"].indexOf(dayAbbrev);
        const currentDay = today.getDay() === 0 ? 6 : today.getDay() - 1;
        const dayOffset = dayIndex - currentDay;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dayOffset);
        const formattedDate = targetDate.toISOString().split('T')[0];
        
        console.log(`Speichere: ${cellData.task} am ${dayAbbrev} ${startTime}-${endTime}`);
        
        // Parameter direkt an Query übergeben
        await createRoomSchedule.run({
          employeeId: cellData.assignedEmployee || null,
          taskId: cellData.taskId,
          dayAbbrev: dayAbbrev,
          startTime: startTime,
          endTime: endTime,
          date: formattedDate
        });
        
        savedCount++;
      }
      
      // Grid neu laden
      await getRoomSchedules.run();
      showAlert(`${savedCount} Raum-Termine erfolgreich gespeichert!`, 'success');
      
    } catch (error) {
      console.error('Save failed:', error);
      
      console.log('🔍 Full error object:', error);

      // Extrahiere die echte DB-Fehlermeldung aus dem Appsmith Error-Objekt
      let dbErrorMessage = '';

      // Prüfe verschiedene Stellen wo die DB-Fehlermeldung stehen könnte
      if (error.details) {
        dbErrorMessage = error.details;
      } else if (error.response && error.response.error) {
        dbErrorMessage = error.response.error;  
      } else if (error.data && error.data.error) {
        dbErrorMessage = error.data.error;
      } else if (typeof error === 'object' && error.error) {
        dbErrorMessage = error.error;
      } else {
        dbErrorMessage = error.message || error.toString();
      }

      console.log('🎯 Extracted DB error:', dbErrorMessage);

      // Säubere die Fehlermeldung (entferne "ERROR:" und "Where:" Teile)
      const cleanErrorMessage = dbErrorMessage
        .replace(/^ERROR:\s*/, '')
        .replace(/\s*Where:.*$/, '')
        .trim();

      console.log('✨ Clean error message:', cleanErrorMessage);

      // Verwende die gesäuberte Fehlermeldung
      const errorMessage = cleanErrorMessage;
      
      // Prüfe ob es ein Mitarbeiter-Konflikt ist
      if (errorMessage.includes('ist bereits von') && errorMessage.includes('verplant')) {
        
        // Zeige detaillierte Konflikt-Meldung
        showAlert(
          `⚠️ MITARBEITER-ÜBERSCHNEIDUNG ERKANNT!\n\n${errorMessage}\n\n` +
          `❌ EMPFEHLUNG: Ändern Sie die Zeit oder wählen Sie einen anderen Mitarbeiter.\n\n` +
          `Falls Sie trotzdem speichern möchten, verwenden Sie Force Save.`, 
          'warning'
        );
        
        // Setze Flag für Force Save Option
        await storeValue('lastConflictError', errorMessage);
        await storeValue('showForceSaveOption', true);
        
      } else {
        // Andere Datenbankfehler
        showAlert('Fehler beim Speichern: ' + errorMessage, 'error');
      }
    }
  },
  
  // Force Save Funktion (falls User trotzdem speichern will)
  forceSave: async () => {
    try {
      console.log('⚠️ Force saving - deaktiviere Trigger temporär...');
      
      // 1. Trigger deaktivieren
      await DisableTriggerQuery.run();
      
      // 2. Nochmal versuchen zu speichern
      const payload = RoomPlanningWidget.model.lastSaveData || {};
      const newGridState = payload.gridState || {};
      let savedCount = 0;
      
      for (const [key, cellData] of Object.entries(newGridState)) {
        if (!cellData?.root || cellData.existing) continue;
        
        const [dayAbbrev, startTime] = key.split("-");
        
        // Endzeit berechnen (gleiche Logik wie oben)
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + (cellData.duration_minutes || 60);
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
        
        // Datum berechnen
        const today = new Date();
        const dayIndex = ["Mo", "Di", "Mi", "Do", "Fr"].indexOf(dayAbbrev);
        const currentDay = today.getDay() === 0 ? 6 : today.getDay() - 1;
        const dayOffset = dayIndex - currentDay;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dayOffset);
        const formattedDate = targetDate.toISOString().split('T')[0];
        
        await createRoomSchedule.run({
          employeeId: cellData.assignedEmployee || null,
          taskId: cellData.taskId,
          dayAbbrev: dayAbbrev,
          startTime: startTime,
          endTime: endTime,
          date: formattedDate
        });
        
        savedCount++;
      }
      
      // 3. Trigger wieder aktivieren
      await EnableTriggerQuery.run();
      
      // 4. Grid neu laden
      await getRoomSchedules.run();
      
      // 5. Force Save Option ausblenden
      await storeValue('showForceSaveOption', false);
      await storeValue('lastConflictError', null);
      
      showAlert(`⚠️ ${savedCount} Termine mit ÜBERBUCHUNG gespeichert! Bitte prüfen Sie die Planung.`, 'warning');
      
    } catch (forceError) {
      console.error('Force save failed:', forceError);
      
      // Sicherstellen dass Trigger wieder aktiviert wird
      try {
        await EnableTriggerQuery.run();
      } catch (triggerError) {
        console.error('Failed to re-enable trigger:', triggerError);
      }
      
      showAlert(`Force Save fehlgeschlagen: ${forceError.message}`, 'error');
    }
  }
}