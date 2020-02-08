import { css, keyframes } from '@emotion/core';
import styled from '@emotion/styled';

export const Wrapper = styled.section`
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	overflow-y: auto;
	background-color: #2f343d;
	align-items: center;
	-webkit-app-region: drag;
	justify-content: center;

	${ ({ isVisible }) => css`display: ${ isVisible ? 'flex' : 'none' };` };
	${ ({ isFull }) => css`left: ${ isFull ? '0' : '68px' };` }
`;

export const Content = styled.div`
	width: 520px;
	max-width: 100%;
`;

export const Header = styled.header`
	margin: 18px 0;
`;

export const Form = styled.form`
	-webkit-app-region: no-drag;
	position: relative;
	margin: 25px 0;
	padding: 22px 30px 30px;
	border-radius: 2px;
	background-color: #fafafa;
	box-shadow: 0 0 6px 10px rgba(0, 0, 0, 0.1);
`;

export const Prompt = styled.label`
	display: block;
	margin: 0;
	color: #444444;
	line-height: 24px;
	margin: 18px 0;
	letter-spacing: -0.5px;
	text-transform: uppercase;
	font-size: 20px;
	font-weight: 300;
	text-align: center;
`;

export const InputWrapper = styled.div`
	position: relative;
	margin: 0 0 14px;
`;

export const Input = styled.input`
	width: 100%;
	height: 35px;
	border-radius: 2px;
	outline: none;
	line-height: normal;
	position: relative;
	padding: 4px 8px;
	border-width: 0;
	border-bottom: 1px solid #dfdfdf;
	background-color: transparent;
	box-shadow: 0 0 0;
	font-size: 22px;
	font-weight: 400;
	font-family: inherit;

	${ ({ isFailed }) => isFailed && css`
		animation: ${ keyframes`
			0%,
			100% {
				transform: translate3d(0, 0, 0);
			}

			10%,
			30%,
			50%,
			70%,
			90% {
				transform: translate3d(-10px, 0, 0);
			}

			20%,
			40%,
			60%,
			80% {
				transform: translate3d(10px, 0, 0);
			}
		` } 1s;
	` }
`;

export const ErrorDisplay = styled.div`
	margin-bottom: 20px;
	padding: 15px;
	border: 1px solid rgba(0, 0, 0, 0);
	border-radius: 4px;
	color: #a94442;
	border-color: #ebccd1;
	background-color: #f2dede;
	text-align: center;
	font-weight: bold;
`;

export const FormActions = styled.div`
	display: flex;
	justify-content: center;
`;

export const SubmitButton = styled.button`
	font-family: inherit;
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
