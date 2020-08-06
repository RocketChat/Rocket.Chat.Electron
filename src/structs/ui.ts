export type WindowState = {
	focused: boolean;
	visible: boolean;
	maximized: boolean;
	minimized: boolean;
	fullscreen: boolean;
	normal: boolean;
	bounds: {
		x: number | undefined,
		y: number | undefined,
		width: number,
		height: number,
	}
};
