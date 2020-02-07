import { css, keyframes } from '@emotion/core';
import styled from '@emotion/styled';

export const StyledWebView = styled('webview')`
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

	${ ({ isFull }) => css`left: ${ isFull ? '0' : '68px' };` }
	${ ({ isSelected }) => css`z-index: ${ isSelected ? '1' : '0' };` }
	${ ({ isFailed }) => css`display: ${ isFailed ? 'flex' : 'none' };` }
`;

export const LoadingErrorPage = styled.div`
	display: flex;
	flex-direction: column;
	min-width: 100vw;
	min-height: 100vh;
	cursor: default;
	user-select: none;
	background-color: #2f343d;
	background-image: url('../public/images/not-found.jpg');
	background-repeat: no-repeat;
	background-position: center bottom;
	background-size: cover;
	align-items: center;
	justify-content: center;
`;

export const Announcement = styled.h1`
	text-align: center;
	color: rgba(255, 255, 255, 0.85);
	line-height: 1.5em;
`;

export const Title = styled.h2`
	text-align: center;
	color: rgba(255, 255, 255, 0.85);
	line-height: 1.5em;
	font-weight: normal;
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
	border-radius: 100%;
	background-color: currentColor;

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

	&:nth-of-type(1) {
		animation-delay: -0.32s;
	}

	&:nth-of-type(2) {
		animation-delay: -0.16s;
	}
`;

export const ReloadButton = styled.button`
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

	&:hover {
		text-decoration: none;
		color: #ffffff;
	}

	&:disabled {
		cursor: not-allowed;
		pointer-events: none;
		color: #888888;
		background-color: #dddddd;
		box-shadow: none;
	}
`;
