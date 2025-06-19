export default {
  deleteRoomSchedule: async () => {
    try {
      console.log('Starting delete single...');
      
      if (!RoomPlanningWidget.model || !RoomPlanningWidget.model.scheduleIdToDelete) {
        showAlert('Keine Schedule-ID zum Löschen vorhanden!', 'warning');
        return;
      }
      
      const scheduleId = RoomPlanningWidget.model.scheduleIdToDelete;
      console.log('Deleting schedule ID:', scheduleId);
      
      // Store value für deleteScheduleEntryById
      await storeValue('scheduleIdToDelete', scheduleId);
      
      // Delete ausführen
      await deleteScheduleEntryById.run();
      
      // Grid neu laden
      await getRoomSchedules.run();
      
      showAlert('Raum-Termin gelöscht!', 'info');
      console.log('Successfully deleted schedule:', scheduleId);
      
    } catch (error) {
      console.error('Delete failed:', error);
      showAlert('Fehler beim Löschen: ' + error.message, 'error');
    }
  }
}