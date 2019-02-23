import { nativeImage, Notification } from 'electron';


function create({ icon, ...options }) {
	const notification = new Notification({
		icon: nativeImage.createFromDataURL(icon),
		...options,
	});

	return notification;
}

export default {
	create,
};
