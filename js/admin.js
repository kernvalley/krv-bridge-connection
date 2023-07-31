import { on } from '@shgysk8zer0/kazoo/dom.js';
import './stepped-form.js';
import { createOrUpdateDoc } from './firebase/firestore.js';
import { uploadFile, getDownloadURL } from './firebase/storage.js';

function validateOrgData(org) {
	return typeof org === 'object';
}

async function getOrgDataFromForm(form) {
	// @TODO: Upload logo and replace with URL
	const data = new FormData(form);
	const uuid = data.get('@identifier') || crypto.randomUUID();
	const snapshot = await uploadFile(data.get('logo'), `/logos/${uuid}/${data.get('logo').name}`);
	console.log(snapshot);
	const hoursAvailable = [{
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Sunday',
		opens: data.get('sundayHoursOpen'),
		closes: data.get('sundayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Monday',
		opens: data.get('mondayHoursOpen'),
		closes: data.get('mondayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Tuesday',
		opens: data.get('tuesdayHoursOpen'),
		closes: data.get('tuesdayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Wednesday',
		opens: data.get('wednesdayHoursOpen'),
		closes: data.get('wednesdayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Thursday',
		opens: data.get('thursdayHoursOpen'),
		closes: data.get('thursdayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Friday',
		opens: data.get('fridayHoursOpen'),
		closes: data.get('fridayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Saturday',
		opens: data.get('saturdayHoursOpen'),
		closes: data.get('saturdayHoursClose'),
	}].filter(({ opens, closes }) => [opens, closes].every(time => typeof time === 'string' && time.length === 5));

	const org = {
		'@context': data.get('@context'),
		'@type': data.get('@type'),
		'@identifier': uuid,
		name: data.get('name'),
		description: data.get('description'),
		logo: await getDownloadURL(snapshot.ref),//data.get('logo'),
		telephone: data.get('telephone'),
		email: data.get('email'),
		url: data.get('url'),
		category: data.get('category'),
		subcategory: data.get('subcategory'),
		address: {
			'@type': 'PostalAddress',
			streetAddress: data.get('streetAddress'),
			postOfficeBoxNumber: data.get('postOfficeBoxNumber'),
			addressLocality: data.get('addressLocality'),
			addressRegion: data.get('addressRegion'),
			postalCode: data.get('postalCode'),
			addressCountry: data.get('addressCountry'),
			hoursAvailable,
		},
		sameAs: [
			data.get('facebook'), data.get('twitter'), data.get('linkedin'), data.get('youtube'),
		].filter(url => typeof url === 'string' && url.length !== 0 && URL.canParse(url)),
	};

	org.location = [org.address];
	org.contactPoints = [{
		'@type': 'ContactPoint',
		contactType: 'Main',
		availableLanguage: 'English',
		email: data.get('email'),
		telephone: data.get('telephone'),
		hoursAvailable,
	}];

	return org;
}

on('#org-category', 'change', ({ target }) => {
	const form = target.form;
	const index = target.selectedIndex;
	const option = target.options.item(index);

	if (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.label.length !== 0) {
		form.querySelector('[name="category"]').value = option.parentElement.label;
	}
});

on('#org-profile-hours .hours-open, #org-profile-hours .hours-close', 'change', ({ target }) => {
	const group = target.closest('.form-group');
	const pair = target.classList.contains('hours-open')
		? group.querySelector('.hours-close')
		: group.querySelector('.hours-open');

	if (target.value === '') {
		pair.required = false;
	} else if (target.classList.contains('hours-open')) {
		pair.required = true;
		pair.min = target.value;
	} else if (target.classList.contains('hours-close')) {
		pair.required = true;
		pair.max = target.value;
	} else {
		throw new DOMException('Missing class to match open and close hours');
	}
});

on('input[data-origin]', 'change', ({ target }) => {
	if (target.value.length === 0) {
		target.setCustomValidity(target.required ? 'A valid URL is required' : '');
	} else if (! URL.canParse(target.value)) {
		target.setCustomValidity('Invalid URL');
	} else if (new URL(target.value).origin !== target.dataset.origin) {
		target.setCustomValidity(`URL must begin with ${target.dataset.origin}`);
	} else {
		target.setCustomValidity('');
	}
});

on('[data-copy-hours]', 'click', ({ currentTarget }) => {
	const group = currentTarget.closest(`.${currentTarget.dataset.copyHours}`);
	const open = group.querySelector('.hours-open').value;
	const close = group.querySelector('.hours-close').value;

	currentTarget.form.querySelectorAll(`.${currentTarget.dataset.copyHours}`).forEach(section => {
		if (! group.isSameNode(section)) {
			section.querySelector('.hours-open').value = open;
			section.querySelector('.hours-close').value = close;
		}
	});
});

on('#org-profile-form', 'submit', async event => {
	event.preventDefault();

	const org = await getOrgDataFromForm(event.target);
	if (validateOrgData(org)) {
		await createOrUpdateDoc('/organizations', org['@identifier'], org);
		navigator.clipboard.writeText(`<script type="application/ld+json">${JSON.stringify(org, null, 4)}</script>`);
		console.log(org);
		// @TODO: Create or Update in Firestore
	} else {
		//
	}
});
