import React from 'react';

import DownloadItem from './DownloadItem';

export default function DownloadsList({ items }) {
	// placeholder for multiple downloads
	return items.map((item) => <DownloadItem />);
};