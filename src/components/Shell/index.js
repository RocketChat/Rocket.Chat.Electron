import { remote } from 'electron';
import React, { useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';

import { GlobalStyles, Wrapper, WindowDragBar, ViewsWrapper } from './styles';
import { SideBar } from '../SideBar';
import { ServersView } from '../ServersView';
import { AddServerView } from '../AddServerView';
import { AboutDialog } from '../AboutDialog';
import { ScreenSharingDialog } from '../ScreenSharingDialog';
import { SelectClientCertificateDialog } from '../SelectClientCertificateDialog';
import { UpdateDialog } from '../UpdateDialog';

export function Shell() {
	useLayoutEffect(() => {
		const linkElement = document.createElement('link');
		linkElement.rel = 'stylesheet';
		linkElement.href = `${ remote.app.getAppPath() }/app/icons/rocketchat.css`;
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
