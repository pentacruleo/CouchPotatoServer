var QualityBase = new Class({

	tab: '',
	content: '',

	setup: function(data){
		var self = this;

		self.qualities = data.qualities;

		self.profiles_list = null;
		self.profiles = [];
		Array.each(data.profiles, self.createProfilesClass.bind(self));

		App.addEvent('loadSettings', self.addSettings.bind(self));

	},

	getProfile: function(id){
		return this.profiles.filter(function(profile){
			return profile.data._id == id;
		}).pick();
	},

	// Hide items when getting profiles
	getActiveProfiles: function(){
		return Array.filter(this.profiles, function(profile){
			return !profile.data.hide;
		});
	},

	getQuality: function(identifier){
		try {
			return this.qualities.filter(function(q){
				return q.identifier == identifier;
			}).pick();
		}
		catch(e){}

		return {};
	},

	addSettings: function(){
		var self = this;

		self.settings = App.getPage('Settings');
		self.settings.addEvent('create', function(){
			var tab = self.settings.createSubTab('profile', {
				'label': 'Quality',
				'name': 'profile',
				'subtab_label': 'Qualities'
			}, self.settings.tabs.searcher ,'searcher');

			self.tab = tab.tab;
			self.content = tab.content;

			self.createProfiles();
			self.createProfileOrdering();
			self.createSizes();

		});

	},

	/**
	 * Profiles
	 */
	createProfiles: function(){
		var self = this;

		var non_core_profiles = Array.filter(self.profiles, function(profile){ return !profile.isCore(); });
		var count = non_core_profiles.length;

		self.settings.createGroup({
			'label': 'Quality Profiles',
			'description': 'Create your own profiles with multiple qualities.'
		}).inject(self.content).adopt(
			self.profile_container = new Element('div.container'),
			new Element('a.add_new_profile', {
				'text': count > 0 ? 'Create another quality profile' : 'Click here to create a quality profile.',
				'events': {
					'click': function(){
						var profile = self.createProfilesClass();
						$(profile).inject(self.profile_container);
					}
				}
			})
		);

		// Add profiles, that aren't part of the core (for editing)
		Array.each(non_core_profiles, function(profile){
			$(profile).inject(self.profile_container);
		});

	},

	createProfilesClass: function(data){
		var self = this;

		data = data || {'id': randomString()};
		var profile = new Profile(data);
		self.profiles.include(profile);

		return profile;
	},

	createProfileOrdering: function(){
		var self = this;

		self.settings.createGroup({
			'label': 'Profile Defaults',
			'description': '(Needs refresh \'' +(App.isMac() ? 'CMD+R' : 'F5')+ '\' after editing)'
		}).grab(
			new Element('.ctrlHolder#profile_ordering').adopt(
				new Element('label[text=Order]'),
				self.profiles_list = new Element('ul'),
				new Element('p.formHint', {
					'html': 'Change the order the profiles are in the dropdown list. Uncheck to hide it completely.<br />First one will be default.'
				})
			)
		).inject(self.content);

		Array.each(self.profiles, function(profile){
			var check;
			new Element('li', {'data-id': profile.data._id}).adopt(
				check = new Element('input[type=checkbox]', {
					'checked': !profile.data.hide,
					'events': {
						'change': self.saveProfileOrdering.bind(self)
					}
				}),
				new Element('span.profile_label', {
					'text': profile.data.label
				}),
				new Element('span.handle.icon-handle')
			).inject(self.profiles_list);
		});

		// Sortable
		var sorted_changed = false;
		self.profile_sortable = new Sortables(self.profiles_list, {
			'revert': true,
			'handle': '.handle',
			'opacity': 0.5,
			'onSort': function(){
				sorted_changed = true;
			},
			'onComplete': function(){
				if(sorted_changed){
					self.saveProfileOrdering();
					sorted_changed = false;
				}
			}
		});

	},

	saveProfileOrdering: function(){
		var self = this,
			ids = [],
			hidden = [];

		self.profiles_list.getElements('li').each(function(el, nr){
			ids.include(el.get('data-id'));
			hidden[nr] = +!el.getElement('input[type=checkbox]').get('checked');
		});

		Api.request('profile.save_order', {
			'data': {
				'ids': ids,
				'hidden': hidden
			}
		});

	},

	/**
	 * Sizes
	 */
	createSizes: function(){
		var self = this;

		var group = self.settings.createGroup({
			'label': 'Qualities',
			'description': 'Edit the minimal and maximum sizes (in MB) for each quality. Please don\'t change any other values unless you know what you are doing.',
			'advanced': true,
			'name': 'sizes'
		}).inject(self.content);

		new Element('div.item.head.ctrlHolder').adopt(
			new Element('span.label', {'text': 'Quality'}),
			new Element('span.min', {'text': 'Min'}),
			new Element('span.max', {'text': 'Max'}),
			new Element('span.hd_label', {'text': 'HD'}),
			new Element('span.allow_3d_label', {'text': '3D'}),
			new Element('span.median_size', {'text': 'Median'}),
			new Element('span.width', {'text': 'Width'}),
			new Element('span.height', {'text': 'Height'}),
			new Element('span.alternative', {'text': 'Alternative'}),
			new Element('span.allow', {'text': 'Allow'}),
			new Element('span.ext', {'text': 'Extensions'}),
			new Element('span.tags', {'text': 'Tags'})
		).inject(group);

		Array.each(self.qualities, function(quality){
			new Element('div.ctrlHolder.item').adopt(
				new Element('span.label', {'text': quality.label}),
				new Element('input.min[type=text]', {
					'value': quality.size_min,
					'events': {
						'keyup': function(e){
							self.changeQuality(quality.identifier, 'size_min', e.target.get('value'));
						}
					}
				}),
				new Element('input.max[type=text]', {
					'value': quality.size_max,
					'events': {
						'keyup': function(e){
							self.changeQuality(quality.identifier, 'size_max', e.target.get('value'));
						}
					}
				}),
				new Element('input.hd[type=checkbox]', {
					'checked': quality.hd,
					'events': {
						'change': function(e){
							self.changeQuality(quality.identifier, 'hd', e.target.get('checked'));
						}
					}
				}),
				new Element('input.allow_3d[type=checkbox]', {
					'checked': quality.allow_3d,
					'events': {
						'change': function(e){
							self.changeQuality(quality.identifier, 'allow_3d', e.target.get('checked'));
						}
					}
				}),
				new Element('input.median_size[type=text]', {
					'value': quality.median_size,
					'events': {
						'keyup': function(e){
							self.changeQuality(quality.identifier, 'median_size', e.target.get('value'));
						}
					}
				}),
				new Element('input.width[type=text]', {
					'value': quality.width,
					'events': {
						'keyup': function(e){
							self.changeQuality(quality.identifier, 'width', e.target.get('value'));
						}
					}
				}),
				new Element('input.height[type=text]', {
					'value': quality.height,
					'events': {
						'keyup': function(e){
							self.changeQuality(quality.identifier, 'height', e.target.get('value'));
						}
					}
				}),
				new Element('input.alternative[type=text]', {
					'value': quality.alternative instanceof Array ? quality.alternative.map(function(e){return e instanceof Array ? e.join(' ') : e; }).join(', ') : quality.alternative,
					'events': {
						'keyup': function(e){
							self.changeQuality(quality.identifier, 'alternative', e.target.get('value'));
						}
					}
				}),
				new Element('input.allow[type=text]', {
					'value': quality.allow instanceof Array ? quality.allow.map(function(e){return e instanceof Array ? e.join(' ') : e; }).join(', ') : quality.allow,
					'events': {
						'keyup': function(e){
							self.changeQuality(quality.identifier, 'allow', e.target.get('value'));
						}
					}
				}),
				new Element('input.ext[type=text]', {
					'value': quality.ext instanceof Array ? quality.ext.map(function(e){return e instanceof Array ? e.join(' ') : e; }).join(', ') : quality.ext,
					'events': {
						'keyup': function(e){
							self.changeQuality(quality.identifier, 'ext', e.target.get('value'));
						}
					}
				}),
				new Element('input.tags[type=text]', {
					'value': quality.tags instanceof Array ? quality.tags.map(function(e){return e instanceof Array ? e.join(' ') : e; }).join(', ') : quality.tags,
					'events': {
						'keyup': function(e){
							self.changeQuality(quality.identifier, 'tags', e.target.get('value'));
						}
					}
				})
			).inject(group);
		});
	},

	size_timer: {},
	changeQuality: function(identifier, type, value){
		var self = this;

		if(self.size_timer[identifier + type]) clearRequestTimeout(self.size_timer[identifier + type]);

		self.size_timer[identifier + type] = requestTimeout(function(){
			Api.request('quality.save', {
				'data': {
					'identifier': identifier,
					'value_type': type,
					'value': value
				}
			});
		}, 300);

	}

});

window.Quality = new QualityBase();
