import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const globalDTs = (): ScFile => ({
  type: ScNodeType.File,
  content: `/// <reference types="svelte" />`
});
    