import { css } from '@emotion/core';
import styled from '@emotion/styled';


export const Wrapper = styled.section`
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background-color: white;

	overflow-y: auto;
	// align-items: center;
	// -webkit-app-region: drag;
	justify-content: center;

	${ ({ isVisible }) => css`display: ${ isVisible ? 'flex' : 'none' };` };
`;

export const Content = styled.div`
	position: relative;
	top: 10%;
	width: 100%;
	// height: 100%;
	max-width: 100%;
	// max-height: 100%;
`;


export const Title = styled.h1`
	// color: blue;
`;

export const Subtitle = styled.h4`
	color: lightslategrey;
`;
