export default {
	transformGroups: () => {
		return getGroups.data.map(item => ({
			label: item.name,
			value: item.id
		}));
	},
	// Füge hier weitere Transformer-Funktionen hinzu, falls nötig
	transformTeams: () => {
		return getTeams.data.map(item => ({
			label: item.name,
			value: item.id
		}));
	}
}