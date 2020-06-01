import {
	Box,
	Button,
	ButtonGroup,
	Callout,
	Field,
	FieldGroup,
	Margins,
	TextInput,
	Tile,
} from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Wrapper, Content } from './styles';
import { RocketChatLogo } from '../RocketChatLogo';


export function DownloadsManagerView() {
	const isVisible = useSelector(({ currentServerUrl }) => currentServerUrl === 'Downloads');
	return <Wrapper isVisible= {isVisible}>
		<Content>
			<Margins block='x16'>
				<RocketChatLogo alternate/>
			</Margins>
		</Content>
	</Wrapper>;
}
