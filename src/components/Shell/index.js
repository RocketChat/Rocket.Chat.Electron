import { ipcRenderer } from 'electron';
import React, { useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';

import { QUERY_APP_PATH } from '../../ipc';
import { AboutDialog } from '../AboutDialog';
import { AddServerView } from '../AddServerView';
import { ScreenSharingDialog } from '../ScreenSharingDialog';
import { SelectClientCertificateDialog } from '../SelectClientCertificateDialog';
import { ServersView } from '../ServersView';
import { SideBar } from '../SideBar';
import { UpdateDialog } from '../UpdateDialog';
import { GlobalStyles, Wrapper, WindowDragBar, ViewsWrapper } from './styles';

export function Shell() {
	useLayoutEffect(() => {
		const linkElement = document.createElement('link');
		linkElement.rel = 'stylesheet';
		ipcRenderer.invoke(QUERY_APP_PATH).then((appPath) => {
			linkElement.href = `${ appPath }/app/icons/rocketchat.css`;
		});
		document.head.append(linkElement);
	}, []);

	const isFull = useSelector(({ servers, isSideBarEnabled }) => !(servers.length > 0 && isSideBarEnabled));

	return <>
		<GlobalStyles />
		{process.platform === 'darwin' && <WindowDragBar />}
		<Wrapper>
			<SideBar />
			<ViewsWrapper isFull={isFull}>
				<ServersView />
				<AddServerView />
			</ViewsWrapper>
		</Wrapper>
		<AboutDialog />
		<ScreenSharingDialog />
		<SelectClientCertificateDialog />
		<UpdateDialog />
	</>;
}
