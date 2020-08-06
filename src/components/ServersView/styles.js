import { css } from '@emotion/core';
import styled from '@emotion/styled';

export const Wrapper = styled.section`
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background-color: #2f343d;

	${ ({ isVisible }) => css`display: ${ isVisible ? 'flex' : 'none' };` };
`;

export const StyledWebView = styled('webview')`
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;

${ ({ isVisible }) => css`display: ${ isVisible ? 'flex' : 'none' };` }
`;

export const ErrorPane = styled.div`
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;

	flex-direction: column;
	align-items: stretch;
	justify-content: center;
	user-select: none;

	${ ({ isVisible }) => css`display: ${ isVisible ? 'flex' : 'none' };` }
`;
