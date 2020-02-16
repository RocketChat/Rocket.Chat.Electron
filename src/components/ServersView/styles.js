import { css } from '@emotion/core';
import styled from '@emotion/styled';

import { WebViewComponent } from '../electron/WebViewComponent';

export const StyledWebView = styled(WebViewComponent)`
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	transition: opacity linear 100ms;

	${ ({ isFull }) => css`left: ${ isFull ? '0' : '68px' };` }
	${ ({ isSelected }) => css`z-index: ${ isSelected ? '1' : '0' };` }
	${ ({ isFailed }) => css`display: ${ isFailed ? 'none' : 'flex' };` }
	${ ({ hasWebContents }) => css`opacity: ${ hasWebContents ? '1' : '0' };` }
`;

export const ErrorPane = styled.div`
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	transition: opacity linear 100ms;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: center;
	user-select: none;

	${ ({ isFull }) => css`left: ${ isFull ? '0' : '68px' };` }
	${ ({ isSelected }) => css`z-index: ${ isSelected ? '1' : '0' };` }
	${ ({ isFailed }) => css`display: ${ isFailed ? 'flex' : 'none' };` }
`;
