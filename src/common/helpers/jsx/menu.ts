/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */
import type { MenuItemConstructorOptions } from 'electron';

namespace JSXInternal {
  export type IntrinsicElements = {
    menu: {};
    menuitem: Omit<MenuItemConstructorOptions, 'submenu'>;
    separator: {};
  };
}

type Child = MenuItemConstructorOptions | false | null | undefined;

const spreadChildren = (child: Child): MenuItemConstructorOptions[] => {
  if (!child || typeof child !== 'object') {
    return [];
  }

  if (Array.isArray(child)) {
    return child.flatMap(spreadChildren);
  }

  return [child];
};

export function jsx(
  type: 'menu',
  props: {},
  ...children: Child[]
): MenuItemConstructorOptions[];
export function jsx(
  type: 'menuitem',
  props: Omit<MenuItemConstructorOptions, 'submenu'>,
  ...children: Child[]
): MenuItemConstructorOptions;
export function jsx(type: 'separator', props: {}): MenuItemConstructorOptions;
export function jsx<Type extends keyof JSXInternal.IntrinsicElements>(
  type: Type,
  props: JSXInternal.IntrinsicElements[Type],
  ...children: Child[]
): MenuItemConstructorOptions | MenuItemConstructorOptions[] | null {
  switch (type) {
    case 'menu':
      return children.flatMap(spreadChildren);

    case 'menuitem': {
      const submenu = children.flatMap(spreadChildren);

      return {
        submenu: submenu.length > 0 ? submenu : undefined,
        ...props,
      };
    }

    case 'separator':
      return { type: 'separator' };

    default:
      return null;
  }
}

export namespace jsx {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export import JSX = JSXInternal;
}
