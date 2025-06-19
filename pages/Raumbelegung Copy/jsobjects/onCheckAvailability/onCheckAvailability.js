export default {
  checkAvailability: async () => {
    try {
      console.log('🔍 Starting ROBUST availability check...');
      
      // Model-Daten lesen
      if (!RoomPlanningWidget.model || !RoomPlanningWidget.model.checkAvailability) {
        console.log('❌ No checkAvailability data in model');
        await storeValue('availabilityConflicts', []);
        await storeValue('availabilityRequestId', 'no-data');
        return;
      }
      
      const checkData = RoomPlanningWidget.model.checkAvailability;
      console.log('📋 Checking availability for:', checkData);
      
      if (!checkData.employeeId) {
        console.log('ℹ️ No employee to check - marking as available');
        await storeValue('availabilityConflicts', []);
        await storeValue('availabilityRequestId', checkData.requestId || 'no-employee');
        return;
      }
      
      // ✅ ERWEITERTE PARAMETER-VALIDIERUNG
      const requiredParams = ['employeeId', 'dayAbbrev', 'startTime', 'endTime'];
      const missingParams = requiredParams.filter(param => !checkData[param]);
      
      if (missingParams.length > 0) {
        console.log('❌ Missing required parameters:', missingParams);
        await storeValue('availabilityConflicts', []);
        await storeValue('availabilityRequestId', checkData.requestId || 'missing-params');
        showAlert('Fehlende Parameter für Verfügbarkeitsprüfung: ' + missingParams.join(', '), 'error');
        return;
      }
      
      console.log('🚀 Executing availability query with parameters:', {
        employeeId: checkData.employeeId,
        dayAbbrev: checkData.dayAbbrev,
        startTime: checkData.startTime,
        endTime: checkData.endTime,
        requestId: checkData.requestId
      });
      
      // ✅ PARAMETER-PATTERN wie beim Save mit EXPLIZITER Fehlerbehandlung
      try {
        await checkEmployeeAvailability.run({
          employeeId: checkData.employeeId,
          dayAbbrev: checkData.dayAbbrev,
          startTime: checkData.startTime,
          endTime: checkData.endTime
        });
        
        console.log('✅ Query executed successfully');
        
      } catch (queryError) {
        console.error('❌ Query execution failed:', queryError);
        await storeValue('availabilityConflicts', []);
        await storeValue('availabilityRequestId', checkData.requestId || 'query-error');
        showAlert('Datenbankabfrage fehlgeschlagen: ' + queryError.message, 'error');
        return;
      }
      
      // ✅ ERGEBNIS VALIDIEREN und speichern
      const conflicts = checkEmployeeAvailability.data;
      console.log('📊 Raw query result:', conflicts);
      console.log('📊 Query result type:', typeof conflicts, Array.isArray(conflicts));
      
      let safeConflicts = [];
      if (Array.isArray(conflicts)) {
        safeConflicts = conflicts;
      } else if (conflicts && typeof conflicts === 'object') {
        // Einzelnes Objekt in Array umwandeln
        safeConflicts = [conflicts];
      } else if (conflicts === null || conflicts === undefined) {
        safeConflicts = [];
      } else {
        console.log('⚠️ Unexpected query result format, treating as no conflicts');
        safeConflicts = [];
      }
      
      console.log('📊 Processed conflicts array:', safeConflicts);
      
      await storeValue('availabilityConflicts', safeConflicts);
      
      // ✅ REQUEST-ID SETZEN um Widget zu signalisieren dass Ergebnis da ist
      await storeValue('availabilityRequestId', checkData.requestId || 'completed');
      
      console.log(`✅ Availability check completed successfully:`, {
        requestId: checkData.requestId,
        conflictsFound: safeConflicts.length,
        conflicts: safeConflicts
      });
      
      // ✅ OPTIONAL: User-Feedback bei Konflikten (nur für Debug)
      if (safeConflicts && safeConflicts.length > 0) {
        console.log(`⚠️ Found ${safeConflicts.length} scheduling conflicts for employee ${checkData.employeeId}`);
        console.log('Conflicts details:', safeConflicts);
      } else {
        console.log(`✅ No conflicts found for employee ${checkData.employeeId}`);
      }
      
    } catch (error) {
      console.error('💥 Availability check failed with error:', error);
      console.error('Error stack:', error.stack);
      
      // ✅ FEHLER-HANDLING: Auch bei Fehlern Request-ID setzen
      const requestId = RoomPlanningWidget.model?.checkAvailability?.requestId || 'error';
      await storeValue('availabilityConflicts', []);
      await storeValue('availabilityRequestId', requestId);
      
      showAlert('Verfügbarkeitsprüfung fehlgeschlagen: ' + error.message, 'error');
    }
  }
}