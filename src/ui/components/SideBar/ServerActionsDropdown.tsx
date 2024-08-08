import { useRef } from "react";
import { useDropdownVisibility } from "./useDropdownVisibility";

type ServerActionsDropdownProps = {
    url: string;
};

const ServerActionsDropdown = ({
  url,

}: ServerActionsDropdownProps) => {
	const reference = useRef(null);
	const target = useRef(null);
  const { isVisible, toggle } = useDropdownVisibility({ reference, target });
  return ( );
};

export default ServerActionsDropdown;
