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

      const tasks = getTasks.data || []; // Assuming getTasks is available
      let savedCount = 0;
      let conflictDetected = false; // Neues Flag für Konflikte

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
        const currentDay = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0=So, 1=Mo... anpassen für Mo=0, Di=1
        const dayOffset = dayIndex - currentDay;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dayOffset);
        const formattedDate = targetDate.toISOString().split('T')[0];

        console.log(`Speichere: ${cellData.task} am ${dayAbbrev} ${startTime}-${endTime}`);

        try {
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
        } catch (itemError) {
          console.error('Error saving individual item:', itemError);
          conflictDetected = true; // Setze Konflikt-Flag

          let itemErrorMessage = '';
          if (itemError.details) {
            itemErrorMessage = itemError.details;
          } else if (itemError.response && itemError.response.error) {
            itemErrorMessage = itemError.response.error;
          } else if (itemError.data && itemError.data.error) {
            itemErrorMessage = itemError.data.error;
          } else if (typeof itemError === 'object' && itemError.error) {
            itemErrorMessage = itemError.error;
          } else {
            itemErrorMessage = itemError.message || itemError.toString();
          }
          const cleanItemErrorMessage = itemErrorMessage
            .replace(/^ERROR:\s*/, '')
            .replace(/\s*Where:.*$/, '')
            .trim();

          // Zeige Konfliktmeldung für den spezifischen Eintrag
          showAlert(`Konflikt für ${dayAbbrev} ${startTime}-${endTime}: ${cleanItemErrorMessage}`, 'warning');
        }
      }

      // Grid neu laden, unabhängig ob alles gespeichert wurde oder nicht
      await getRoomSchedules.run();

      if (conflictDetected) {
        showAlert(
          `${savedCount} Termine erfolgreich gespeichert, aber es gab Konflikte bei anderen Terminen. Bitte überprüfen!`,
          'warning'
        );
        // Nur anzeigen, wenn ein Konflikt aufgetreten ist
        await storeValue('showForceSaveOption', true);
      } else if (savedCount > 0) {
        showAlert(`${savedCount} Raum-Termine erfolgreich gespeichert!`, 'success');
        await storeValue('showForceSaveOption', false); // Option ausblenden
      } else {
        showAlert('Keine neuen Termine zum Speichern oder alle vorhandenen sind fehlerhaft.', 'info');
        await storeValue('showForceSaveOption', false); // Option ausblenden
      }

    } catch (error) {
      console.error('General save process failed:', error);
      // Dies fängt Fehler ab, die NICHT durch den DB-Trigger ausgelöst wurden
      showAlert('Ein allgemeiner Fehler ist aufgetreten: ' + (error.message || error.toString()), 'error');
      await storeValue('showForceSaveOption', false); // Option ausblenden
    }
  },

  // Force Save Funktion
  forceSave: async () => {
    // HIER MUSS 'savedCount' initialisiert werden
    let savedCount = 0; // <--- DIESE ZEILE HINZUFÜGEN
    try {
      console.log('⚠️ Force saving - deaktiviere Trigger temporär...');

      // 1. Trigger deaktivieren
      await DisableTriggerQuery.run();

      // 2. Nochmal versuchen zu speichern
      const payload = RoomPlanningWidget.model.lastSaveData || {};
      const newGridState = payload.gridState || {};
      // savedCount = 0; // Hier nicht nötig, da es oben deklariert wird

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

    } catch (forceError) {
      console.error('Force save failed:', forceError);
      showAlert(`Force Save fehlgeschlagen: ${forceError.message || forceError.toString()}`, 'error');
    } finally {
      // WICHTIG: Trigger IMMER wieder aktivieren, auch bei Fehlern im Force Save
      try {
        await EnableTriggerQuery.run();
        console.log('Trigger re-enabled successfully.');
      } catch (triggerError) {
        console.error('Failed to re-enable trigger (CRITICAL):', triggerError);
        showAlert('KRITISCHER FEHLER: Trigger konnte nicht re-aktiviert werden! Bitte Datenbank-Admin informieren!', 'error');
      }
      // Aufräumen und Ansicht aktualisieren, egal ob erfolgreich oder nicht
      await getRoomSchedules.run();
      await storeValue('showForceSaveOption', false);
      await storeValue('lastConflictError', null);
      if (savedCount > 0) {
        showAlert(`⚠️ ${savedCount} Termine wurden ÜBERBUCHT gespeichert! Bitte prüfen Sie die Planung sorgfältig.`, 'warning');
      }
    }
  }
}