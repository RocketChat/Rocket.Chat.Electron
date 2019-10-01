import { nativeImage, Notification } from 'electron';


function create({ icon, ...options }) {
	const notification = new Notification({
		icon: icon && nativeImage.createFromDataURL(icon),
		...options,
	});

	return notification;
}

export default {
	create,
};
