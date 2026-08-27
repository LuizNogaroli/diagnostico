const DIAGNOSTICO_COLUMNS = [
    'rip', 'processo', 'identificacao', 'coordenadas', 'imagem',
    'tipo_imovel', 'tipo_imovel_outro', 'natureza', 'inscricao_municipal', 'ccir',
    'conceituacao', 'conceituacao_agua_especificar', 'classificacao', 'classificacao_uso_especificar',
    'area', 'observacoes1', 'reg_cartorial', 'reg_matricula_detalhes', 'reg_transcricao_detalhes',
    'mat_individualizada', 'circunscricoes', 'titularidade', 'titularidade_outros',
    'area_terreno', 'area_construcao', 'sistema', 'sistema_spiu_rip', 'sistema_siapa_rip',
    'sistema_cidi_nbp', 'sistema_sarp_contrato', 'loteamento', 'loteamento_detalhes',
    'planta_sei', 'planta_sei_pdf', 'zoneamento', 'aquisicao', 'aquisicao_outra',
    'dom_informacoes_complementares', 'demarcacao', 'demarcacao_estagio',
    'id_direta', 'idd_relatorio', 'idd_estagio', 'planta_pdf', 'memorial',
    'urb_informacoes_complementares', 'vetorial',
    'interf_fronteira', 'interf_seguranca', 'interf_1320m', 'interf_100m', 'interf_dominio',
    'afet_uc', 'uc_tipo', 'afet_indigena', 'afet_tradicionais', 'afet_quilombolas',
    'afet_porto', 'afet_pdisp', 'afet_reurb', 'afet_rffsa', 'afet_tombado',
    'tom_tipo', 'afet_outro', 'afet_outro_espec', 'afet_informacoes_complementares',
    'enc_diligencias', 'enc_ajustes', 'enc_analise', 'enc_informacoes_complementares', 'assinatura'
];

const TABELA_SPU_COLUMNS = [
    'rip', 'processo', 'identificacao', 'coordenadas', 'imagem',
    'tipo_imovel', 'tipo_imovel_outro', 'natureza', 'inscricao_municipal', 'ccir',
    'conceituacao', 'conceituacao_agua_especificar', 'classificacao', 'classificacao_uso_especificar',
    'area', 'observacoes1', 'reg_cartorial', 'reg_matricula_detalhes', 'reg_transcricao_detalhes',
    'mat_individualizada', 'circunscricoes', 'titularidade', 'titularidade_outros',
    'area_terreno', 'area_construcao', 'sistema', 'sistema_spiu_rip', 'sistema_siapa_rip',
    'sistema_cidi_nbp', 'sistema_sarp_contrato', 'loteamento', 'loteamento_detalhes',
    'planta_sei', 'planta_sei_pdf', 'zoneamento', 'aquisicao', 'aquisicao_outra',
    'dom_informacoes_complementares', 'demarcacao', 'demarcacao_estagio',
    'id_direta', 'idd_relatorio', 'idd_estagio', 'planta_pdf', 'memorial',
    'urb_informacoes_complementares', 'vetorial',
    'interf_fronteira', 'interf_seguranca', 'interf_1320m', 'interf_100m', 'interf_dominio',
    'afet_uc', 'uc_tipo', 'afet_indigena', 'afet_tradicionais', 'afet_quilombolas',
    'afet_porto', 'afet_pdisp', 'afet_reurb', 'afet_rffsa', 'afet_tombado',
    'tom_tipo', 'afet_outro', 'afet_outro_espec', 'afet_informacoes_complementares',
    'enc_diligencias', 'enc_ajustes', 'enc_analise', 'enc_informacoes_complementares', 'assinatura'
];

function filterColumns(data, validColumns) {
    const filtered = {};
    for (const key of Object.keys(data)) {
        if (validColumns.includes(key)) {
            filtered[key] = data[key];
        }
    }
    return filtered;
}

module.exports = { DIAGNOSTICO_COLUMNS, TABELA_SPU_COLUMNS, filterColumns };
