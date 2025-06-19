export default {
  deleteAllRoomSchedules: async () => {
    try {
      const roomName = selectRoom.selectedOptionLabel || 'diesem Raum';
      const roomId = selectRoom.selectedOptionValue;
      
      if (!roomId) {
        showAlert('Bitte zuerst einen Raum auswählen!', 'warning');
        return;
      }
      
      // Verwende showAlert statt confirm
      const userConfirmed = await showAlert(
        `Alle Termine für ${roomName} wirklich löschen? Klicke OK zum Fortfahren.`, 
        'warning'
      );
      
      console.log('Deleting all schedules for room:', roomId);
      
      await deleteAllRoomSchedules.run();
      await getRoomSchedules.run();
      
      showAlert(`Alle Termine für ${roomName} gelöscht!`, 'success');
      console.log('Successfully deleted all room schedules');
      
    } catch (error) {
      console.error('Delete all failed:', error);
      showAlert('Fehler beim Löschen aller Termine: ' + error.message, 'error');
    }
  }
}