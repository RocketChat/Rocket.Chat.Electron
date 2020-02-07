import { css } from '@emotion/core';
import styled from '@emotion/styled';

export const Wrapper = styled.dialog`
	z-index: 1000;
	top: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	width: 600px;
	height: 330px;
	padding: 0.25rem 0.75rem;
	cursor: default;
	user-select: none;
	color: #444444;
	background-color: #F4F4F4;

	&:not([open]) {
		display: none;
	}
`;

export const Content = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
	align-items: center;
	justify-content: center;
`;

export const Title = styled.h1`
	margin: 0 0 1rem;
	font-size: 1.5rem;
	line-height: normal;
`;

export const Message = styled.p`
	margin: 0 0 1rem;
	line-height: normal;
`;

export const Info = styled.div`
	display: flex;
	align-items: center;
`;

export const CurrentVersion = styled.div`
	flex: 1;
	margin: 1rem;
	text-align: center;
	white-space: nowrap;
	line-height: normal;
	color: #7f7f7f;
`;

export const NewVersion = styled.div`
	flex: 1;
	margin: 1rem;
	text-align: center;
	white-space: nowrap;
	line-height: normal;
`;

export const Label = styled.div``;

export const Value = styled.div`
	font-size: 1.5rem;
	font-weight: bold;
`;

export const Arrow = styled.div`
	flex: 1;
	margin: 1rem;
	font-size: 2rem;
`;

export const Actions = styled.div`
	display: flex;
	flex: 0;
	justify-content: flex-end;
`;

export const Button = styled.button`
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

	${ ({ secondary }) => secondary && css`
		color: #444444;
		background-color: #EAEAEA;

		&:hover {
			text-decoration: none;
		}
	` }
	}

	&:first-of-type {
		margin-right: auto;
	}

	&:hover {
		text-decoration: none;
	}
`;
