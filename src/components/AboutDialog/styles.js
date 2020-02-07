import { keyframes } from '@emotion/core';
import styled from '@emotion/styled';

export const Wrapper = styled.dialog`
	z-index: 1000;
	top: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	width: 400px;
	height: 300px;
	padding: 0.25rem 0.75rem;
	cursor: default;
	user-select: none;
	color: #444444;
	background-color: #F4F4F4;

	&:not([open]) {
		display: none;
	}
`;

export const AppInfo = styled.section`
	display: flex;
	flex-direction: column;
	flex: 1;
	justify-content: center;
`;

export const AppVersion = styled.div`
	margin: 0 auto;
	font-size: 0.75rem;
`;

export const Version = styled.span`
	cursor: text;
	user-select: text;
	font-weight: bold;
`;

export const Updates = styled.section`
	display: flex;
	flex-direction: column;
	flex: 1;
	justify-content: center;
`;

export const CheckForUpdatesButton = styled.button`
	position: relative;
	display: inline-block;
	margin: 4px;
	padding: 9px 12px;
	cursor: pointer;
	word-spacing: 0;
	text-transform: uppercase;
	color: rgba(255, 255, 255, 0.85);
	border: none;
	border-radius: 2px;
	background-color: #1d74f5;
	font-size: 13px;
	font-weight: 500;
	line-height: 16px;
	height: 2.5rem;

	&:hover {
		text-decoration: none;
		color: #ffffff;
	}
`;

export const LoadingIndicator = styled.div`
	display: flex;
	height: 2.5rem;
	margin: 4px;
	color: #7f7f7f;
	align-items: center;
	justify-content: center;
`;

export const LoadingIndicatorDot = styled.span`
	width: 0.5rem;
	height: 0.5rem;
	margin: 0.1rem;
	animation: ${ keyframes`
		0%,
		80%,
		100% {
			transform: scale(0);
		}

		40% {
			transform: scale(1);
		}
` } 1.4s infinite ease-in-out both;
	border-radius: 100%;
	background-color: currentColor;

	&:nth-of-type(1) {
		animation-delay: -0.32s;
	}

	&:nth-of-type(2) {
		animation-delay: -0.16s;
	}
`;

export const LoadingIndicatorMessage = styled.span`
	font-size: 1rem;
`;

export const CheckForUpdatesOnStartupLabel = styled.label`
	margin: 0.1rem auto;
	font-size: 0.8rem;
`;

export const CheckForUpdatesOnStartupInput = styled.input``;

export const Copyright = styled.div`
	margin: 0 auto;
	font-size: 0.65rem;
`;
