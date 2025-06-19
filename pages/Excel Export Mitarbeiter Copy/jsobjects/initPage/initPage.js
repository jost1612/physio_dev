export default {
    initPage: async () => {
        // WICHTIG: Gib dem Widget einen winzigen Moment Zeit (z.B. 50 Millisekunden),
        // um seinen Wert aus der URL zu übernehmen.
        await new Promise(resolve => setTimeout(resolve, 200));
        // JETZT ist der Wert im Select-Widget garantiert gesetzt.
        // Führe nun die Abfrage für die Tabelle aus.
        return getTasksWithColors.run();
    }
}