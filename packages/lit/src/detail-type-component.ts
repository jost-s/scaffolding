import { ScFile, ScNodeType } from '@source-craft/types';
import { VocabularyElementsImportDeclarations } from '@type-craft/web-components';
import { VocabularyTypescriptGenerators } from '@type-craft/typescript';
import { FieldDefinition, TypeDefinition } from '@type-craft/vocabulary';
import { camelCase, flatten, kebabCase, snakeCase, uniq, upperFirst } from 'lodash-es';

export function generateTypeDetailLitComponent(
  typescriptGenerators: VocabularyTypescriptGenerators,
  elementsImports: VocabularyElementsImportDeclarations,
  type: TypeDefinition<any, any>,
  dnaName: string,
  zomeName: string,
): ScFile {
  const detailWebComponent = `
import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import { InstalledCell, AppWebsocket, Record, ActionHash, InstalledAppInfo } from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { decode } from '@msgpack/msgpack';
import { appInfoContext, appWebsocketContext } from '../../../contexts';
import { ${upperFirst(camelCase(type.name))} } from '../../../types/${dnaName}/${zomeName}';
import '@material/mwc-circular-progress';
${uniq(flatten(type.fields?.map(f => fieldImports(typescriptGenerators, elementsImports, f)))).join('\n')}

@customElement('${kebabCase(type.name)}-detail')
export class ${upperFirst(camelCase(type.name))}Detail extends LitElement {
  @property()
  actionHash!: ActionHash;

  @state()
  _${camelCase(type.name)}: ${upperFirst(camelCase(type.name))} | undefined;

  @contextProvided({ context: appWebsocketContext })
  appWebsocket!: AppWebsocket;

  @contextProvided({ context: appInfoContext })
  appInfo!: InstalledAppInfo;

  async firstUpdated() {
    const cellData = this.appInfo.cell_data.find((c: InstalledCell) => c.role_id === '${dnaName}')!;

    const record: Record | undefined = await this.appWebsocket.callZome({
      cap_secret: null,
      cell_id: cellData.cell_id,
      zome_name: '${zomeName}',
      fn_name: 'get_${snakeCase(type.name)}',
      payload: this.actionHash,
      provenance: cellData.cell_id[1]
    });

    if (record) {
      this._${camelCase(type.name)} = decode((record.entry as any).Present.entry) as ${upperFirst(camelCase(type.name))};
    }
  }

  render() {
    if (!this._${camelCase(type.name)}) {
      return html\`<div style="display: flex; flex: 1; align-items: center; justify-content: center">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>\`;
    }

    return html\`
      <div style="display: flex; flex-direction: column">
        <span style="font-size: 18px">${upperFirst(camelCase(type.name))}</span>

        ${type.fields.map(f => fieldDetailTemplate(type.name, elementsImports, f)).join('\n\n        ')}

      </div>
    \`;
  }
}
`;

  return {
    type: ScNodeType.File,
    content: detailWebComponent,
  };
}

function fieldDetailTemplate(
  typeName: string,
  elementsImports: VocabularyElementsImportDeclarations,
  field: FieldDefinition<any>,
): string {
  const fieldRenderers = elementsImports[field.type];

  if (!fieldRenderers || !fieldRenderers.detail) return '';

  return `
    <${fieldRenderers.detail.tagName}
    ${Object.entries(field.configuration)
      .map(([configPropName, configValue]) => `${configPropName}="${configValue}"`)
      .join(' ')}
    .value=\${this._${camelCase(typeName)}.${field.name}}
      style="margin-top: 16px"
    ></${fieldRenderers.detail.tagName}>`;
}

function fieldImports(
  typescriptGenerators: VocabularyTypescriptGenerators,
  elementsImports: VocabularyElementsImportDeclarations,
  field: FieldDefinition<any>,
): string[] {
  let imports = [];

  if (typescriptGenerators[field.type]) imports = [...imports, ...typescriptGenerators[field.type].imports];
  if (elementsImports[field.type] && elementsImports[field.type].detail)
    imports = [...imports, elementsImports[field.type].detail.sideEffectImport];

  return imports.map(i => i.importDeclaration);
}
