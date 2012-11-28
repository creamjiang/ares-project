/**
 * This kind is the top kind of project handling. It contains:
 * - The project list 
 * - the interface towards the user's file (harmonia)
 * - Popups to manage projects (create, scan, error ...)
 */
enyo.kind({
	name: "ProjectView",
	kind: "FittableColumns",
	classes: "enyo-unselectable",
	components: [
		{kind: "ProjectList",
			onModifySettings: "modifySettingsAction",
			onCreateProject: "createProjectAction",
			onScanProject: "scanProjectAction",
			onProjectRemoved: "projectRemoved",
			onProjectSelected: "handleProjectSelected",
			name: "projectList"},
		{kind: "Harmonia", fit:true, name: "harmonia", providerListNeeded: false},
		{kind: "ProjectWizardCreate", canGenerate: false, name: "projectWizardCreate"},
		{kind: "ProjectWizardScan", canGenerate: false, name: "projectWizardScan"},
		{kind: "ProjectWizardModify", canGenerate: false, name: "projectWizardModify"},
		{name: "errorPopup", kind: "Ares.ErrorPopup", msg: "unknown error", details: ""},
		{name: "waitPopup", kind: "onyx.Popup", centered: true, floating: true, autoDismiss: false, modal: true, style: "text-align: center; padding: 20px;", components: [
			{kind: "Image", src: "$phobos/images/save-spinner.gif", style: "width: 54px; height: 55px;"},
			{name: "waitPopupMessage", content: "Ongoing...", style: "padding-top: 10px;"}
		]}
	],
	handlers: {
		onAddProjectInList: "addProjectInList",
		onPhonegapBuild: "startPhonegapBuild",
		onBuildStarted: "phonegapBuildStarted",
		onError: "showErrorMsg"
	},

	showErrorMsg: function(inSender, inEvent) {
		this.log(inEvent);
		this.hideWaitPopup();
		this.showErrorPopup(inEvent.msg);
		return true; //Stop event propagation
	},
	showErrorPopup : function(msg, details) {
		this.$.errorPopup.setErrorMsg(msg);
		this.$.errorPopup.setDetails(details);
		this.$.errorPopup.show();
	},

	scanProjectAction: function(inSender, inEvent) {
		this.$.projectWizardScan.setHeaderText('Select a directory containing one or more project.json files');
		this.$.projectWizardScan.show();
		return true; //Stop event propagation
	},
	createProjectAction: function(inSender, inEvent) {
		this.$.projectWizardCreate.start();
		return true; //Stop event propagation
	},
	modifySettingsAction: function(inSender, inEvent) {
		this.$.projectWizardModify.start(this.currentProject);
		return true; //Stop event propagation
	},

	addProjectInList: function(inSender, inEvent) {
		try {
			// Add an entry into the project list
			this.$.projectList.addProject(inEvent.name, inEvent.folderId, inEvent.service);
		} catch(e) {
				var msg = e.toString();
				this.showErrorPopup(msg);
				this.error(msg);
				return false;
		}
		return true; //Stop event propagation
	},
	handleProjectSelected: function(inSender, inEvent) {
		var project = inEvent.project;
		// Pass service definition & configuration to Harmonia
		// & consequently to HermesFileTree
		this.$.harmonia.setProject(project);
		// FIXME: temporary hack to create config.json on the
		// fly if needed... would be better to create/load it
		// when the workspace is loaded & when a new project
		// is created that would save per-click HTTP traffic
		// to the FileSystemService.
		self = this;
		project.config = new ProjectConfig();
		project.config.init({
			service: project.service.impl,
			folderId: project.folderId
		}, function(err) {
			if (err) self.showErrorPopup(err.toString());
		});
		this.currentProject = project;
		return true; //Stop event propagation
	},
	projectRemoved: function(inSender, inEvent) {
		this.$.harmonia.setProject(null);
	},
	showWaitPopup: function(inMessage) {
		this.$.waitPopupMessage.setContent(inMessage);
		this.$.waitPopup.show();
	},
	hideWaitPopup: function() {
		this.$.waitPopup.hide();
	},
	startPhonegapBuild: function(inSender, inEvent) {
		if (!this.currentProject) {
			return true; // stop bubble-up
		}
		var self = this;
		this.showWaitPopup("Starting project build");
		// [0] assumes a single builder
		var bdService =	ServiceRegistry.instance.getServicesByType('build')[0];
		if (bdService) {
			bdService.build( /*project*/ {
				name: this.currentProject.name,
				filesystem: this.currentProject.service.impl,
				folderId: this.currentProject.folderId,
				config: this.currentProject.config
			}, function(inError, inDetails) {
				self.hideWaitPopup();
				if (inError) {
					self.showErrorPopup(inError.toString(), inDetails);
				}
			});
		} else {
			this.error("No build service defined:", inEvent);
			this.doError({msg: 'No build service defined'});
		}
		return true; // stop bubble-up
	},
	phonegapBuildStarted: function(inSender, inEvent) {
		this.showWaitPopup("Phonegap build started");
		setTimeout(enyo.bind(this, "hideWaitPopup"), 2000);
	}
});
