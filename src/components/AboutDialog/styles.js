import { keyframes } from '@emotion/core';
import styled from '@emotion/styled';

export const LoadingIndicator = styled.div`
	display: flex;
	height: 40px;
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
