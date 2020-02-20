import { css } from '@emotion/core';
import styled from '@emotion/styled';

export const Wrapper = styled.div`
	flex: 0 0 68px;
	align-self: stretch;

	display: flex;
	flex-direction: column;
	align-items: stretch;

	user-select: none;
	-webkit-app-region: drag;

	transition:
		margin-inline-start 230ms ease-in-out,
		visibility 230ms ease-in-out;

	${ ({ background }) => css`background: ${ background || '#2f343d' };` }
	${ ({ color }) => css`color: ${ color || '#ffffff' };` }
	${ ({ isVisible }) => !isVisible && css`
		margin-inline-start: -68px;
		visibility: hidden;
	` }
`;

export const Content = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1 1 0;
	padding-top: 10px;
	background-color: rgba(0, 0, 0, 0.1);
	align-items: stretch;

	${ ({ withWindowButtons }) => withWindowButtons && css`padding-top: 28px;` }
`;

export const ServerList = styled.ol`
	-webkit-app-region: no-drag;
	display: flex;
	flex-direction: column;
	flex: 0 0 auto;
	margin: 0;
	padding: 0;
	align-items: stretch;
`;

const withTooltip = ({ tooltip }) => css`
	&::after {
		position: absolute;
		top: 50%;
		left: 100%;
		display: block;
		visibility: hidden;
		padding: 0.5rem 1rem;
		content: ${ JSON.stringify(tooltip) };
		transition: all var(--transitions-duration) ease-out var(--transitions-duration);
		transform: translate(10px, -50%);
		white-space: nowrap;
		pointer-events: none;
		opacity: 0;
		color: #ffffff;
		border-radius: 2px;
		background-color: #1f2329;
		font-size: 0.875rem;
		line-height: normal;
		z-index: 100000;
	}

	&:hover::after {
		visibility: visible;
		transform: translate(0, -50%);
		opacity: 1;
	}
`;

export const ServerButtonWrapper = styled.li`
	position: relative;
	flex: 0 0 auto;
	box-sizing: border-box;
	margin: 4px 0;
	font-size: 24px;
	line-height: 1.25;
	display: flex;
	cursor: pointer;
	color: inherit;
	align-items: center;
	flex-flow: row wrap;
	justify-content: space-between;

	${ ({ isDragged }) => isDragged && css`opacity: 0.5;` }

	&::before {
		flex: 0 0 auto;
		width: 5px;
		height: 0;
		margin-right: -5px;
		content: '';
		transition:
			height var(--transitions-duration),
			opacity var(--transitions-duration);
		border-radius: 0 3px 3px 0;
		background-color: #ffffff;

		${ ({ hasUnreadMessages }) => hasUnreadMessages && css`
			height: 6px;
			opacity: 0.6;
		` }

		${ ({ isSelected }) => isSelected && css`
			height: 30px;
			opacity: 1;
		` }
	}

	${ withTooltip }
`;

export const Avatar = styled.span`
	flex: 1 1 auto;
	display: flex;
	flex-flow: row nowrap;
	align-items: center;
	justify-content: center;
	height: 42px;
	transition: opacity var(--transitions-duration);

	${ ({ isSelected }) => css`opacity: ${ isSelected ? '1' : '0.6' };` }

	&:hover {
		${ ({ isSelected }) => css`opacity: ${ isSelected ? '1' : '0.8' };` }
	}
`;

export const Initials = styled.span`
	line-height: 42px;

	${ ({ visible }) => css`display: ${ visible ? 'initial' : 'none' };` }
`;

export const Favicon = styled.img`
	max-width: 100%;
	height: 100%;
	object-fit: contain;
	${ ({ visible }) => css`display: ${ visible ? 'initial' : 'none' };` }
`;

export const Badge = styled.div`
	position: absolute;
	z-index: 1;
	top: 2px;
	right: 8px;
	display: block;
	min-width: 15px;
	text-align: center;
	color: #ffffff;
	border-radius: 20px;
	background-color: #e43325;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
	font-size: 10px;
	font-weight: bold;
	line-height: 15px;
`;

export const KeyboardShortcut = styled.div`
	flex: 1 0 100%;
	padding-top: 8px;
	text-align: center;
	font-size: 12px;
	line-height: 1;
	${ ({ visible }) => css`visibility: ${ visible ? 'visible' : 'hidden' };` }
`;

export const AddServerButton = styled.button`
	font-family: inherit;
	position: relative;
	flex: 0 0 auto;
	box-sizing: border-box;
	margin: 4px 0;
	font-size: 2.5rem;
	line-height: 1.25;
	display: flex;
	flex-direction: row;
	height: 40px;
	padding: 0;
	color: inherit;
	border: none;
	background: none;
	align-items: center;
	justify-content: center;
`;

export const AddServerButtonLabel = styled.span`
	display: block;
	line-height: 30px;
	width: 40px;
	height: 40px;
	transition: opacity var(--transitions-duration);
	opacity: 0.6;
	color: inherit;
	background-color: rgba(0, 0, 0, 0.1);
	cursor: pointer;

	&:hover {
		opacity: 1;
	}

	${ withTooltip }
`;
