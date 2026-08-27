// Estado Global
let currentStep = 1;
const totalSteps = 5;
const API_URL = '/api/diagnostico';
const API_URL_SPU = '/api/tabela-spu';

// Mapa: número do step → arquivo HTML (step 0 = Situação Cadastral, na página inicial, sem nav)
const stepFileMap = {
    0: 'index.html',
    1: 'etapa-1.html',
    2: 'etapa-2.html',
    3: 'etapa-3.html',
    4: 'etapa-4.html',
    5: 'etapa-5.html'
};

const urlParams = new URLSearchParams(window.location.search);
const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
// Página inicial sem RIP ativo: descarta RIP remanescente e mostra a busca
if (isIndexPage && !urlParams.has('rip')) {
    localStorage.removeItem('spu_current_rip');
}
const currentRip = urlParams.get('rip') || localStorage.getItem('spu_current_rip');
const isCadastroMode = urlParams.get('modo') === 'cadastro';
const isEtapaPage = window.location.pathname.includes('etapa-');
// Registro provisório (ediável): cadastro em andamento (modo=cadastro) ou RIP temporário (SPU-YYYYMMDD-HHMMSS ou NOVO-)
const isProvisionalRip = isCadastroMode || (currentRip && (currentRip.startsWith('NOVO-') || /^SPU-\d{8}-\d{6}$/.test(currentRip)));
// Modo do formulário: 'consulta' (RIP definitivo, somente leitura) ou 'edicao' (registro provisório)
let formMode = isProvisionalRip ? 'edicao' : 'consulta';

document.addEventListener('DOMContentLoaded', function() {
    if ((isEtapaPage || isIndexPage) && currentRip) {
        document.getElementById('rip').value = currentRip;
        
        // Esconde a busca por RIP quando já há um RIP ativo (modo wizard)
        const buscaContainer = document.getElementById('busca-rip-container');
        if (buscaContainer) buscaContainer.style.display = 'none';
        
        // Auto-seleciona a base de dados se veio do index.html
        const baseParam = urlParams.get('base');
        if (baseParam) {
            // Tenta setar radio (compatibilidade com etapas antigas)
            const baseRadio = document.querySelector(`input[name="sistema"][value="${baseParam}"]`);
            if (baseRadio) {
                baseRadio.checked = true;
                baseRadio.dispatchEvent(new Event('change'));
            }
            // Seta hidden field
            const sistemaHidden = document.getElementById('sistema-hidden');
            if (sistemaHidden) sistemaHidden.value = baseParam;
            
            // Exibe o nome da base na página inicial (step 0)
            const sistemaExibicao = document.getElementById('sistema-exibicao');
            if (sistemaExibicao) sistemaExibicao.innerText = baseParam;
        }
        
        // Exibe o RIP na página inicial (step 0)
        const ripExibicao = document.getElementById('rip-exibicao');
        if (ripExibicao && currentRip) ripExibicao.innerText = currentRip;

        // Exibe RIP e Base na etapa-1
        const ripDisplay = document.getElementById('rip-display');
        if (ripDisplay && currentRip) ripDisplay.innerText = currentRip;
        
        const ripLabel = document.getElementById('rip-label');
        if (ripLabel) {
            ripLabel.innerText = (formMode === 'consulta') ? 'RIP:' : 'Registro Provisório:';
        }

        const baseDisplay = document.getElementById('base-display');
        if (baseDisplay && baseParam) baseDisplay.innerText = baseParam;
        
        // Garante que o form, stepper e o step específico fiquem visíveis no multipage
        const alertMsg = document.getElementById('alert-message');

        if (alertMsg) {
            if (formMode === 'edicao') {
                // Registro provisório: edição liberada
                alertMsg.innerHTML = `✏️ <strong>MODO EDIÇÃO</strong> - registro provisório<br>
                <span style="font-size: 12px; color: #64748b;">Número de registro: ${currentRip}</span>`;
                alertMsg.style.fontSize = '14px';
                alertMsg.style.fontWeight = '500';
                alertMsg.style.color = '#166534';
                alertMsg.style.background = '#f0fdf4';
                alertMsg.style.padding = '10px';
                alertMsg.style.borderRadius = '8px';
                alertMsg.style.border = '1px solid #86efac';
            } else {
                // Modo consulta: somente leitura
                alertMsg.innerHTML = `📖 <strong>MODO CONSULTA</strong> - campos somente leitura<br>
                <span style="font-size: 12px; color: #64748b;">Campos vazios marcados em vermelho. Use o box "Há necessidade de alteração cadastral?" para solicitar correções.</span>`;
                alertMsg.style.fontSize = '14px';
                alertMsg.style.fontWeight = '500';
                alertMsg.style.color = '#1e3a8a';
                alertMsg.style.background = '#eff6ff';
                alertMsg.style.padding = '10px';
                alertMsg.style.borderRadius = '8px';
                alertMsg.style.border = '1px solid #93c5fd';
            }
        }

        const form = document.getElementById('form-diagnostico');
        if (form) form.style.display = 'block';
        
        const stepper = document.getElementById('stepper');
        if (stepper) stepper.style.display = 'flex';
        
        const steps = document.querySelectorAll('.wizard-step');
        steps.forEach(s => s.classList.add('active'));

        // Atualiza os links do stepper (bolinhas) para serem hrefs multipage
        const stepperLinks = document.querySelectorAll('.stepper-menu a');
        stepperLinks.forEach(link => {
            // Pular links que já são hrefs (como o link para index na etapa-2)
            if (link.getAttribute('href')) return;
            
            const onClickAttr = link.getAttribute('onclick');
            if (onClickAttr && onClickAttr.includes('goToStep')) {
                const stepMatch = onClickAttr.match(/goToStep\((\d+)\)/);
                if (stepMatch) {
                    const stepNum = parseInt(stepMatch[1]);
                    const targetFile = stepFileMap[stepNum] || `etapa-${stepNum}.html`;
                    const modoParam = (isCadastroMode || isProvisionalRip) ? '&modo=cadastro' : '';
                    link.href = `${targetFile}?rip=${currentRip}${modoParam}`;
                    link.removeAttribute('onclick');
                }
            }
        });

        highlightCurrentStep();

        // Na etapa final, disponibiliza o botão do relatório de solicitações
        const btnRelatEtapa8 = document.getElementById('btn-relatorio-solicitacoes');
        if (btnRelatEtapa8 && getCurrentStepFromPath() === 5) {
            btnRelatEtapa8.style.display = 'inline-block';
        }

        // Busca dados existentes (consulta e cadastro)
        fetch(`${API_URL}/${currentRip}`)
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    popularFormulario(result.data);
                    formatFormForEdit();
                    if (formMode === 'consulta') {
                        bloquearModoConsulta();
                    } else {
                        // Esconder box de solicitação em modo de edição
                        document.querySelectorAll('.solicitacao-box').forEach(box => {
                            box.style.display = 'none';
                        });
                    }
                } else if (isProvisionalRip) {
                    // Registro provisório sem dados salvos: limpa formulário e libera edição
                    limparFormulario();
                    formatFormForEdit();
                    // Esconder box de solicitação em modo de edição
                    document.querySelectorAll('.solicitacao-box').forEach(box => {
                        box.style.display = 'none';
                    });
                } else {
                    alertMsg.innerText = 'RIP não encontrado na base de dados.';
                    alertMsg.style.color = 'red';
                }
            })
            .catch(err => {
                console.error("Erro ao carregar dados:", err);
                if (isProvisionalRip) {
                    limparFormulario();
                    formatFormForEdit();
                }
            });

        // Carrega a solicitação de alteração já salva desta etapa, se houver
        const solicitacaoEtapa = document.getElementById('solicitacao_etapa_nome');
        if (solicitacaoEtapa) {
            fetch(`/api/solicitacoes/${encodeURIComponent(currentRip)}`)
                .then(res => res.json())
                .then(result => {
                    if (result.success && result.data) {
                        const sol = result.data.find(s => s.campo_nome === solicitacaoEtapa.value);
                        const textarea = document.getElementById('solicitacao_alteracao');
                        if (sol) {
                            if (textarea) textarea.value = sol.novo_valor || '';
                            renderSolicitacaoArquivos(sol.arquivos);
                            const radioSim = document.querySelector('input[name="solicitacao_sim_nao"][value="Sim"]');
                            if (radioSim) {
                                radioSim.checked = true;
                                toggleSolicitacaoCampos(radioSim);
                            }
                        }
                    }
                })
                .catch(() => {});
        }
    }

    // --- Lógica Condicional Original ---
    function setupRadioToggle(radioName, targetValue, targetElementId) {
        const radios = document.querySelectorAll(`input[name="${radioName}"]`);
        const targetElement = document.getElementById(targetElementId);
        if (!targetElement) return;
        function toggle() {
            const selected = document.querySelector(`input[name="${radioName}"]:checked`);
            if (selected && selected.value === targetValue) {
                targetElement.style.display = 'block';
            } else {
                targetElement.style.display = 'none';
            }
        }
        radios.forEach(radio => radio.addEventListener('change', toggle));
        toggle(); 
    }

    // Mostra o elemento alvo quando o rádio selecionado está entre vários valores ("ou")
    function setupRadioToggleMulti(radioName, targetValues, targetElementId) {
        const radios = document.querySelectorAll(`input[name="${radioName}"]`);
        const targetElement = document.getElementById(targetElementId);
        if (!targetElement) return;
        function toggle() {
            const selected = document.querySelector(`input[name="${radioName}"]:checked`);
            const show = selected && targetValues.includes(selected.value);
            targetElement.style.display = show ? 'block' : 'none';
        }
        radios.forEach(radio => radio.addEventListener('change', toggle));
        toggle(); 
    }
    
    function setupCheckboxToggle(checkboxId, targetElementId) {
        const checkbox = document.getElementById(checkboxId);
        const targetElement = document.getElementById(targetElementId);
        if (!checkbox || !targetElement) return;
        function toggle() {
            if (checkbox.checked) {
                targetElement.style.display = 'block';
            } else {
                targetElement.style.display = 'none';
            }
        }
        checkbox.addEventListener('change', toggle);
        toggle(); 
    }

    setupRadioToggle('tipo_imovel', 'Outro', 'campo_tipo_outro');
    setupRadioToggle('natureza', 'Urbano', 'campo_nat_urbano');
    setupRadioToggle('natureza', 'Rural', 'campo_nat_rural');
    setupRadioToggle('conceituacao', 'Água Pública', 'campo_conc_agua');
    setupRadioToggle('classificacao', 'Uso Comum', 'campo_class_uso');
    setupRadioToggle('reg_cartorial', 'Matrícula', 'campo_reg_mat');
    setupRadioToggle('reg_cartorial', 'Transcrição', 'campo_reg_trans');
    setupRadioToggleMulti('reg_cartorial', ['Matrícula', 'Transcrição'], 'campo_reg_cartorial_detalhe');
    setupRadioToggle('titularidade', 'Outros', 'campo_tit_outros');
    setupRadioToggle('sistema', 'SPIUnet', 'campo_sis_spiu');
    setupRadioToggle('sistema', 'SIAPA', 'campo_sis_siapa');
    setupRadioToggle('sistema', 'CIDI', 'campo_sis_cidi');
    setupRadioToggle('sistema', 'SARP', 'campo_sis_sarp');
    setupRadioToggle('loteamento', 'Sim', 'campo_lot_sim');
    setupRadioToggle('aquisicao', 'Outra', 'campo_aqui_outra');
    setupRadioToggle('demarcacao', 'Iniciada', 'campo_dem_ini');
    setupRadioToggle('id_direta', 'Concluida', 'campo_idd_con');
    setupRadioToggle('id_direta', 'Iniciada', 'campo_idd_ini');

    setupCheckboxToggle('check_afet_uc', 'campo_afet_uc');
    setupCheckboxToggle('check_afet_tom', 'campo_afet_tom');
    setupCheckboxToggle('check_afet_out', 'campo_afet_out');

    // --- Lógica de Busca de CEP ---
    const btnBuscarCep = document.getElementById('btn-buscar-cep');
    const cepInput = document.getElementById('cep');
    if (btnBuscarCep && cepInput) {
        btnBuscarCep.addEventListener('click', () => buscarCep());
        cepInput.addEventListener('blur', () => {
            const v = cepInput.value.replace(/\D/g, '');
            if (v.length === 8) buscarCep();
        });
        cepInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 5) v = v.slice(0,5) + '-' + v.slice(5,8);
            e.target.value = v;
        });
    }

    async function buscarCep() {
        const cep = (document.getElementById('cep')?.value || '').replace(/\D/g, '');
        const status = document.getElementById('cep-status');
        if (cep.length !== 8) {
            if (status) status.innerHTML = '<span style="color:#dc2626;">CEP inválido</span>';
            return;
        }
        if (status) status.innerHTML = '<span style="color:#0056b3;">Buscando...</span>';
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await resp.json();
            if (data.erro) {
                if (status) status.innerHTML = '<span style="color:#dc2626;">CEP não encontrado</span>';
                return;
            }
            document.getElementById('logradouro').value = data.logradouro || '';
            document.getElementById('bairro').value = data.bairro || '';
            document.getElementById('uf').value = data.uf || '';
            document.getElementById('cidade').value = data.localidade || '';
            if (status) status.innerHTML = '<span style="color:#16a34a;">✓ Endereço preenchido. Buscando coordenadas...</span>';

            // Geocodificação via Nominatim
            const query = `${data.logradouro}, ${data.localidade}, ${data.uf}, Brasil`;
            try {
                const geoResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                    headers: { 'Accept': 'application/json' }
                });
                const geoData = await geoResp.json();
                if (geoData.length > 0) {
                    const lat = parseFloat(geoData[0].lat).toFixed(6);
                    const lon = parseFloat(geoData[0].lon).toFixed(6);
                    document.getElementById('coordenadas_lat').value = lat;
                    document.getElementById('coordenadas_lon').value = lon;
                    if (status) status.innerHTML = '<span style="color:#16a34a;">✓ Endereço e coordenadas preenchidos</span>';
                } else {
                    if (status) status.innerHTML = '<span style="color:#16a34a;">✓ Endereço preenchido (coordenadas não encontradas)</span>';
                }
            } catch (geoErr) {
                if (status) status.innerHTML = '<span style="color:#16a34a;">✓ Endereço preenchido (erro ao buscar coordenadas)</span>';
            }
        } catch (e) {
            if (status) status.innerHTML = '<span style="color:#dc2626;">Erro ao consultar CEP</span>';
        }
    }


    // --- Lógica de Busca e Início ---
    const btnBuscar = document.getElementById('btn-buscar-rip');
    const inputSearch = document.getElementById('search_rip');
    const form = document.getElementById('form-diagnostico');
    const stepper = document.getElementById('stepper');
    const alertMsg = document.getElementById('alert-message');

    if (btnBuscar) {
        btnBuscar.addEventListener('click', async () => {
            const rip = inputSearch.value.trim();
            if (!rip) {
                alert('Por favor, digite um valor válido para pesquisa.');
                return;
            }

            // Verifica qual base foi selecionada (só existe no index.html)
            const baseRadio = document.querySelector('input[name="base_dados"]:checked');
            const baseSelecionada = baseRadio ? baseRadio.value : '';

            alertMsg.innerText = 'Buscando...';
            alertMsg.style.color = '#0056b3';

            try {
                const response = await fetch(`${API_URL}/${rip}`);
                const result = await response.json();

                if (result.success) {
                    localStorage.setItem('spu_current_rip', rip);
                    const baseParam = baseSelecionada ? `&base=${encodeURIComponent(baseSelecionada)}` : '';
                    showModalMessage(
                        `<div style="font-size: 20px; color: #166534; font-weight: bold; margin-bottom: 8px;">RIP encontrado!</div>
                         <div style="font-size: 13px; color: #475569;">Redirecionando para o formulário...</div>`,
                        `etapa-1.html?rip=${rip}${baseParam}`,
                        1500
                    );
                } else {
                    alertMsg.innerText = 'RIP não encontrado na base de dados.';
                    alertMsg.style.color = 'red';
                }

            } catch (error) {
                alertMsg.innerText = 'Erro de conexão com o servidor.';
                alertMsg.style.color = 'red';
                console.error(error);
            }
        });
    }

    // --- Lógica para Novo Cadastro (sem RIP) ---
    const btnNovoCadastro = document.getElementById('btn-novo-cadastro');
    if (btnNovoCadastro) {
        btnNovoCadastro.addEventListener('click', () => {
            const tempRip = 'SPU-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Date.now().toString().slice(-6);
            
            if (confirm(`Deseja iniciar um novo cadastro?\n\nSeu número de registro temporário será:\n${tempRip}\n\nEste número será confirmado ao finalizar o diagnóstico.`)) {
                localStorage.setItem('spu_current_rip', tempRip);
                window.location.href = `etapa-1.html?rip=${tempRip}&modo=cadastro`;
            }
        });
    }

    // --- Lógica de Salvamento Parcial ---
    const btnSaveNexts = document.querySelectorAll('.btn-save-next');
    btnSaveNexts.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const nextStep = parseInt(e.target.getAttribute('data-next'));
            await salvarParcial();
            goToStep(nextStep);
        });
    });

    // Salvar Final
    const btnFinal = document.getElementById('btn-final-submit');
    if (btnFinal) {
        btnFinal.addEventListener('click', async () => {
            // Renomeia RIP temporário (SPU-YYYYMMDD-HHMMSS) para definitivo
            if (currentRip && /^SPU-\d{8}-\d{6}$/.test(currentRip)) {
                // Gera número de registro definitivo
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                const finalRip = `SPU-${year}${month}${day}-${hours}${minutes}${seconds}`;

                // 1) Salva a etapa atual sob o RIP temporário (preserva dados de todas as etapas)
                const saved = await salvarParcial();
                if (!saved) return;

                // 2) Renomeia o RIP temporário para o definitivo
                const renameResp = await fetch('/api/diagnostico/renomear', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ de: currentRip, para: finalRip })
                });
                const renameResult = await renameResp.json();

                if (!renameResult.success) {
                    alert('Erro ao finalizar o cadastro: ' + (renameResult.error || 'resposta sem sucesso'));
                    return;
                }

                // 3) Atualiza o campo RIP no formulário
                const ripField = document.getElementById('rip');
                if (ripField) {
                    ripField.value = finalRip;
                }
                
                // 4) Atualiza os links do stepper para usar o novo RIP
                const stepperLinks = document.querySelectorAll('.stepper-menu a');
                stepperLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.includes('modo=cadastro')) {
                        link.href = href.replace(currentRip, finalRip);
                    }
                });
                
                // 5) Atualiza a variável global (via URL params) e o localStorage
                urlParams.set('rip', finalRip);
                localStorage.setItem('spu_current_rip', finalRip);
                
                // 6) Redireciona para a página de conclusão (modo edição: sem relatório de solicitações)
                window.location.href = `conclusao.html?rip=${finalRip}&modo=edicao`;
                return;
                
                /* // CÓDIGO ANTIGO REMOVIDO
                showConclusaoModal(`
                    <div style="font-size: 20px; color: #166534; font-weight: bold; margin-bottom: 12px;">✅ Diagnóstico Concluído com Sucesso!</div>
                    <div style="font-size: 14px; color: #166534; margin-bottom: 8px;">Número de Registro Gerado:</div>
                    <div style="font-size: 22px; color: #15803d; font-weight: bold; background: #f0fdf4; padding: 10px; border-radius: 6px; border: 1px solid #86efac;">${finalRip}</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 12px;">Guarde este número para consultas futuras.</div>
                `);
                
                // 7) Atualiza os botões de relatório
                const btnRelatorio = document.getElementById('btn-relatorio-solicitacoes');
                if (btnRelatorio) {
                    btnRelatorio.style.display = 'inline-block';
                    btnRelatorio.onclick = () => window.open('relatorio.html?rip=' + finalRip, '_blank');
                }

                const btnResumo = document.getElementById('btn-resumo-completo');
                if (btnResumo) {
                    btnResumo.style.display = 'inline-block';
                    btnResumo.onclick = () => window.open('resumo.html?rip=' + finalRip, '_blank');
                }
                */
            } else {
                // Modo consulta: redireciona para a página de conclusão
                await salvarParcial();
                const modoParam = (formMode === 'edicao') ? '&modo=edicao' : '';
                window.location.href = `conclusao.html?rip=${currentRip}${modoParam}`;
                
                /* // CÓDIGO ANTIGO REMOVIDO
                showConclusaoModal('<div style="font-size: 20px; color: #166534; font-weight: bold;">Diagnóstico concluído com sucesso!</div>');
                
                const btnRelatorio = document.getElementById('btn-relatorio-solicitacoes');
                if (btnRelatorio) btnRelatorio.style.display = 'inline-block';

                const btnResumo = document.getElementById('btn-resumo-completo');
                if (btnResumo) btnResumo.style.display = 'inline-block';
                */
            }
        });
    }
});

// --- Funções Auxiliares (Wizard e Fetch) ---

window.pesquisarRip = async function(sistema) {
    const input = document.querySelector(`input[name="sistema_${sistema.toLowerCase() === 'spiunet' ? 'spiu_rip' : sistema.toLowerCase() === 'siapa' ? 'siapa_rip' : sistema.toLowerCase() === 'cidi' ? 'cidi_nbp' : 'sarp_contrato'}"]`);
    const ripPesquisado = input.value;

    if (!ripPesquisado) {
        alert('Por favor, digite um valor válido para pesquisa.');
        return;
    }

    // Chamada real à API
    try {
        const response = await fetch(`${API_URL}/${ripPesquisado}`);
        const result = await response.json();
        if (result.success) {
            popularFormulario(result.data);
            
            // Conta campos vazios para mostrar resumo
            const form = document.getElementById('form-diagnostico');
            const missingFields = form.querySelectorAll('.missing-data');
            const missingCount = missingFields.length;
            
            if (missingCount > 0) {
                alert(`Dados carregados com sucesso!\n\n⚠️ ATENÇÃO: ${missingCount} campo(s) estão vazios na base de dados e estão destacados em vermelho.\n\nPreencha os campos em vermelho para completar o diagnóstico.`);
            } else {
                alert('Dados carregados com sucesso! Todos os campos foram preenchidos na base.');
            }
        } else {
            alert('RIP não encontrado na base de dados.');
        }
    } catch (err) {
        alert('Erro ao buscar dados.');
        console.error(err);
    }
}

// Limpar formulário (Novo Cadastro)
window.limparFormulario = function() {
    const form = document.getElementById('form-diagnostico');
    if (!form) return;
    
    // Reseta inputs de texto, textarea e select
    form.querySelectorAll('input[type="text"], textarea, select').forEach(el => {
        if (el.id !== 'rip') {
            el.value = '';
        }
    });
    
    // Resetar radios/checkboxes e disparar evento para atualizar visibilidade
    form.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(el => {
        el.checked = false;
        // Dispara evento para que a lógica de toggle (ex: esconder campos condicionais) seja executada
        el.dispatchEvent(new Event('change'));
    });
    
    // Re-habilita todos os campos (modo cadastro/limpo)
    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'hidden') return;
        el.disabled = false;
        el.readOnly = false;
        el.style.backgroundColor = '';
        el.style.color = '';
        el.style.cursor = '';
        el.style.borderColor = '';
        el.style.opacity = '';
    });
    
    // Limpar visualizações de arquivos (badges de fotos/anexos)
    ['imagem', 'planta_pdf', 'planta_sei_pdf', 'vetorial'].forEach(key => {
        const listContainer = document.getElementById('file-list_' + key);
        if (listContainer) listContainer.innerHTML = '';
    });

    // Força o fechamento de campos condicionais caso o evento não tenha sido suficiente
    const conditionals = form.querySelectorAll('.conditional-field');
    conditionals.forEach(el => el.style.display = 'none');
}

// Adicionar evento para a opção "Prosseguir sem RIP"
document.addEventListener('DOMContentLoaded', () => {
    // Usar delegação de eventos para garantir que a seleção funcione mesmo se houver conflitos
    document.addEventListener('change', (e) => {
        if (e.target.name === 'sistema' && e.target.value === 'Não localizado') {
            const urlParams = new URLSearchParams(window.location.search);
            // Só gera novo RIP se já não estivermos em um processo de cadastro (evita loop)
            if (!urlParams.has('rip')) {
                const tempRip = 'NOVO-' + Date.now();
                if (confirm('Deseja iniciar um novo cadastro sem RIP? Será gerado um identificador temporário: ' + tempRip)) {
                    window.location.href = `index.html?rip=${tempRip}`;
                } else {
                    // Desmarca o rádio se o usuário cancelar
                    e.target.checked = false;
                }
            }
        }
    });

    // CORREÇÃO: Forçar reset dos checkboxes e rádios se o navegador restaurou estado após F5 ou voltar
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('rip')) {
        // Se não há RIP, presumimos Modo Cadastro e limpamos agressivamente
        setTimeout(limparFormulario, 100); 
    }
});

// Destaca no stepper o número da etapa atual, com base no arquivo (etapa-N.html)
function highlightCurrentStep() {
    const pathname = window.location.pathname;
    const stepMatchPath = pathname.match(/etapa-(\d+)\.html/);
    if (!stepMatchPath) return;
    const currentStepNum = stepMatchPath[1];

    const allIndicators = document.querySelectorAll('.stepper-menu a');
    allIndicators.forEach(ind => {
        ind.style.background = '#e9ecef';
        ind.style.color = '#0056b3';
    });

    const currentIndicator = document.getElementById(`indicator-${currentStepNum}`);
    if (currentIndicator) {
        currentIndicator.style.background = '#0056b3';
        currentIndicator.style.color = 'white';
    }
}

function getCurrentStepFromPath() {
    const m = window.location.pathname.match(/etapa-(\d+)\.html/);
    return m ? parseInt(m[1], 10) : currentStep;
}

window.goToStep = function(step) {
    if (!currentRip) {
        alert("Nenhum RIP ativo. Por favor, inicie ou busque um RIP.");
        return;
    }
    const targetFile = stepFileMap[step] || `etapa-${step}.html`;
    const modoParam = (isCadastroMode || isProvisionalRip) ? '&modo=cadastro' : '';
    window.location.href = `${targetFile}?rip=${currentRip}${modoParam}`;
}

function showToast() {
    const toast = document.getElementById("toast");
    toast.className = "toast show";
    setTimeout(function(){ toast.className = toast.className.replace("show", ""); }, 3000);
}

async function salvarParcial() {
    const form = document.getElementById('form-diagnostico');
    const formData = new FormData(form);

    // Monta identificacao a partir dos campos estruturados de endereço
    const logradouro = formData.get('logradouro') || '';
    const numero = formData.get('numero') || '';
    const complemento = formData.get('complemento') || '';
    const bairro = formData.get('bairro') || '';
    const cidade = formData.get('cidade') || '';
    const uf = formData.get('uf') || '';
    const cep = formData.get('cep') || '';
    const partes = [logradouro, numero, complemento, bairro, cidade, uf].filter(p => p && p.trim());
    if (partes.length > 0) {
        formData.set('identificacao', partes.join(', ') + (cep ? ' - CEP: ' + cep : ''));
    }

    // Monta coordenadas a partir de lat/lon
    const lat = formData.get('coordenadas_lat') || '';
    const lon = formData.get('coordenadas_lon') || '';
    if (lat || lon) {
        formData.set('coordenadas', lat + ', ' + lon);
    }

    // Ajusta o valor dos checkboxes (se estiverem on, enviar 1)
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        if(cb.checked) {
            formData.set(cb.name, 1);
        } else {
            formData.set(cb.name, 0);
        }
    });
    
    try {
        let result = {};

        // Em MODO CONSULTA não grava dados do imóvel: apenas a solicitação de alteração é persistida
        if (formMode !== 'consulta') {
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                body: formData
            });

            const text = await response.text();
            try {
                result = JSON.parse(text);
            } catch (e) {
                throw new Error('Resposta inválida do servidor (HTTP ' + response.status + '): ' + text.slice(0, 200));
            }

            // Salvar em tabela_spu também
            await fetch(`${API_URL_SPU}`, {
                method: 'POST',
                body: formData
            }).catch(() => {});
        }

        // Salva a solicitação de alteração preenchida na etapa atual (texto + arquivos)
        const solicitacaoInput = document.getElementById('solicitacao_alteracao');
        const solicitacaoEtapa = document.getElementById('solicitacao_etapa_nome');
        const solicitacaoArquivos = document.getElementById('solicitacao_arquivos');
        const temTexto = solicitacaoInput && solicitacaoInput.value.trim();
        const temArquivos = solicitacaoArquivos && solicitacaoArquivos.files && solicitacaoArquivos.files.length > 0;
        const solicSimNao = document.querySelector('input[name="solicitacao_sim_nao"]:checked');
        const querSolicitacao = solicSimNao && solicSimNao.value === 'Sim';
        if (querSolicitacao && (temTexto || temArquivos)) {
            const ripAtual = formData.get('rip') || currentRip;
            const solicFormData = new FormData();
            solicFormData.append('rip', ripAtual);
            solicFormData.append('campo_nome', (solicitacaoEtapa && solicitacaoEtapa.value) ? solicitacaoEtapa.value : 'Solicitação de alteração');
            solicFormData.append('valor_atual', '');
            solicFormData.append('novo_valor', solicitacaoInput ? solicitacaoInput.value.trim() : '');
            if (solicitacaoArquivos && solicitacaoArquivos.files) {
                Array.from(solicitacaoArquivos.files).forEach(file => solicFormData.append('arquivos', file));
            }
await fetch('/api/solicitacoes', {
                method: 'POST',
                body: solicFormData
            }).catch(() => {});
        }

        if (formMode === 'consulta' || result.success) {
            showToast();
            const indicatorEl = document.getElementById(`indicator-${getCurrentStepFromPath()}`);
            if (indicatorEl) indicatorEl.classList.add('completed');
            return true;
        } else {
            alert('Erro ao salvar: ' + (result.error || 'resposta sem sucesso'));
            return false;
        }
    } catch (error) {
        console.error('Falha no POST:', error);
        alert('Falha na comunicação com o servidor: ' + (error && error.message ? error.message : error));
        return false;
    }
}

// Modal de mensagem centralizado: fecha após um tempo e, se houver URL, redireciona
function showModalMessage(html, redirectUrl, delayMs) {
    let modal = document.getElementById('modal-conclusao');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-conclusao';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;';
        modal.innerHTML = '<div style="background: white; border-radius: 12px; padding: 30px 40px; max-width: 420px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">' +
            '<div id="modal-conclusao-content" style="color: #166534; font-size: 15px;"></div>' +
        '</div>';
        document.body.appendChild(modal);
    }
    const content = document.getElementById('modal-conclusao-content');
    if (content) content.innerHTML = html;
    modal.style.display = 'flex';
    clearTimeout(modal._timer);
    modal._timer = setTimeout(() => {
        modal.style.display = 'none';
        if (redirectUrl) window.location.href = redirectUrl;
    }, delayMs || 3000);
}

// Modal de conclusão do diagnóstico: fecha após 3s e volta para a etapa 0
function showConclusaoModal(html) {
    localStorage.removeItem('spu_current_rip');
    showModalMessage(html, 'index.html', 3000);
}

// Formatação da Página (Campos Bloqueados + Modal)
function formatFormForEdit() {
    const form = document.getElementById('form-diagnostico');
    
    // Injeta o HTML do Modal de Solicitação apenas uma vez na página
    if (!document.getElementById('solicitacaoModal')) {
        const modalHtml = `
        <div id="solicitacaoModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center;">
            <div class="modal-content" style="background: white; padding: 25px; border-radius: 8px; width: 600px; max-width: 95%; max-height: 90vh; overflow-y: auto;">
                <h3 style="margin-top: 0; color: #0056b3; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; margin-bottom: 20px;">Solicitar Alteração ao Cadastro</h3>
                
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="font-weight: bold; font-size: 14px; color: #495057;">Campo:</label>
                    <input type="text" id="modal-campo-nome" readonly class="readonly-field" style="width: 100%; background: #e9ecef; border: 1px solid #ced4da; padding: 8px; border-radius: 4px; color: #495057;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="font-weight: bold; font-size: 14px; color: #495057;">Valor Atual:</label>
                    <input type="text" id="modal-valor-atual" readonly class="readonly-field" style="width: 100%; background: #e9ecef; border: 1px solid #ced4da; padding: 8px; border-radius: 4px; color: #495057;">
                </div>

                <div class="form-group" style="margin-top: 15px;">
                    <label style="font-weight: bold; font-size: 14px; color: #0056b3;">Correção:</label>
                    <input type="text" id="modal-novo-valor" required placeholder="Digite a correção desejada" style="width: 100%; border: 2px solid #0056b3; padding: 10px; border-radius: 4px;">
                </div>
                
                <div class="form-group" style="margin-top: 15px;">
                    <label style="font-weight: bold; font-size: 14px; color: #0056b3;">Justificativa:</label>
                    <textarea id="modal-justificativa" required rows="3" placeholder="Descreva por que a alteraçõesize: vertical;"></textarea>
                </div>

                <div class="form-group" style="margin-top: 15px;">
                    <label style="font-weight: bold; font-size: 14px; color: #0056b3;">Fundamentação Legal / Portarias:</label>
                    <textarea id="modal-fundamentacao" required rows="3" placeholder="Cite as leis, portarias ou documentos comprobatórios" style="width: 100%; border: 2px solid #0056b3; border-radius: 4px; padding: 10px; resize: vertical;"></textarea>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px;">
                    <button type="button" class="btn-cancel" onclick="closeSolicitacaoModal()" style="padding: 10px 20px; border-radius: 6px; background: #6c757d; color: white; border: none; cursor: pointer; font-weight: bold;">Cancelar</button>
                    <button type="button" class="btn-primary" onclick="submitSolicitacao()" style="padding: 10px 20px; border-radius: 6px; background: #0056b3; color: white; border: none; cursor: pointer; font-weight: bold;">Enviar Solicitação</button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Bloqueia inputs, selects e textareas (exceto botões)
    const elements = form.querySelectorAll('input, select, textarea');
    elements.forEach(el => {
        // Pular campos ocultos
        if(el.type === 'hidden') return;
        
        // Pula campos de solicitação
        if (isCampoSolicitacao(el)) return;
        
        // Se o campo já é readonly (dados da base), aplica classe consulta-readonly
        if (el.readOnly) {
            el.classList.add('consulta-readonly');
            return;
        }
        
        // Se o campo foi desabilitado (checkbox/radio com dado da base), mantém bloqueado
        if (el.disabled) {
            el.classList.add('consulta-readonly');
            el.style.cursor = 'not-allowed';
            return;
        }
        
        el.style.backgroundColor = '';
        el.style.cursor = '';
    });
    if (false) {
        const labels = form.querySelectorAll('label');
        labels.forEach(label => {
            // Ignora labels de options e radio buttons para evitar poluição visual
            const forAttr = label.getAttribute('for');
            if (forAttr) {
                const targetInput = document.getElementById(forAttr);
                if (targetInput && (targetInput.type === 'radio' || targetInput.type === 'checkbox' || targetInput.type === 'file')) {
                    return; 
                }
            }
            
            // Nova checagem: Ignora labels que envolvem diretamente inputs de rádio ou checkbox
            if (label.querySelector('input[type="radio"]') || label.querySelector('input[type="checkbox"]')) {
                return;
            }

            // Não adicionar lápis duplo
            if (!label.querySelector('.icon-edit-request')) {
                const icon = document.createElement('span');
                icon.className = 'icon-edit-request';
                icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-top: -3px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
                icon.title = 'Solicitar alteração deste campo';
                icon.style.cursor = 'pointer';
                icon.style.marginLeft = '8px';
                icon.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fieldName = label.innerText.replace(':', '').replace('✏️', '').trim();
                    const inputId = label.getAttribute('for');
                    let valorAtual = 'Nenhum';
                    if (inputId) {
                        const inp = document.getElementById(inputId);
                        if (inp) valorAtual = inp.value || 'Nenhum';
                    }
                    openSolicitacaoModal(fieldName, valorAtual);
                };
                label.appendChild(icon);
            }
        });
    }

    // Oculta/Exibe Botões de Salvamento
    const saveBtns = form.querySelectorAll('.btn-save-next');
    const nextBtns = form.querySelectorAll('.btn-next-only');
    saveBtns.forEach(btn => {
        btn.style.display = 'inline-block';
    });
    nextBtns.forEach(btn => {
        btn.style.display = 'none';
    });
    
    const finalizeBtn = document.getElementById('btn-finalizar');
    if (finalizeBtn) finalizeBtn.style.display = 'inline-block';

    // Botões de Anexo: em modo consulta, arquivos são somente leitura (não anexa, não exclui)
    const attachBtns = form.querySelectorAll('.btn-attach-file');
    attachBtns.forEach(btn => {
        btn.style.display = formMode === 'consulta' ? 'none' : 'inline-block';
    });
    const fileInputs = form.querySelectorAll('input[type="file"]');
    fileInputs.forEach(inp => {
        // Anexos da solicitação de alteração ficam funcional em ambos os modos
        if (isCampoSolicitacao(inp)) return;
        inp.disabled = formMode === 'consulta';
    });

    // Modo edição: no box "Planta Loteamento" (etapa 3) o campo texto fica oculto — apenas upload de PDF.
    // No modo consulta o campo permanece visível para exibir o valor salvo na base.
    const plantaSeiTexto = document.getElementById('planta_sei');
    if (plantaSeiTexto) plantaSeiTexto.style.display = (formMode === 'edicao') ? 'none' : 'block';

    // Destaca a aba atual no stepper com base no nome do arquivo
    highlightCurrentStep();
}

// ============================================================
// CRITÉRIO DE EDITABILIDADE NO MODO CONSULTA
// No modo consulta, o ÚNICO box editável é a "Solicitação de alteração"
// (o box "Há necessidade de alteração cadastral?"). Um campo pertence a esse
// box quando:
//   1) está dentro de um container com a classe `.solicitacao-box`, OU
//   2) tem atributo name/id começando com "solicitacao"
//      (radios solicitacao_sim_nao, textarea solicitacao_alteracao,
//       arquivos solicitacao_arquivos, etc.).
// TODO o restante do formulário fica bloqueado.
// ============================================================
function isCampoSolicitacao(el) {
    if (!el) return false;
    if (el.closest && el.closest('.solicitacao-box')) return true;
    const n = el.name || '';
    const id = el.id || '';
    // Permite edição de campos de Encaminhamentos, Assinatura e Processo SEI em modo consulta
    if (n.startsWith('enc_') || id === 'assinatura' || id === 'processo' || n === 'processo') return true;
    return n.startsWith('solicitacao') || id.startsWith('solicitacao');
}

// Modo consulta: marca campos vazios com "Vazio" em vermelho e bloqueia TODOS os campos,
// exceto o box "Há necessidade de alteração cadastral?" (solicitação de alteração)
function bloquearModoConsulta() {
    const form = document.getElementById('form-diagnostico');
    if (!form) return;
    
    document.body.classList.add('modo-consulta');

    // Campos de texto vazios recebem a classe .vazio-flag-input
    form.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], input[type="email"], input[type="tel"], textarea').forEach(el => {
        if (isCampoSolicitacao(el)) return;
        if (el.value.trim() === '') {
            el.value = 'Vazio';
            el.classList.add('vazio-flag-input');
        }
    });

    // Selects sem valor selecionado
    form.querySelectorAll('select').forEach(el => {
        if (isCampoSolicitacao(el)) return;
        if (!el.value || el.value === '') {
            const opt = document.createElement('option');
            opt.value = 'Vazio';
            opt.textContent = 'Vazio';
            opt.disabled = true;
            el.appendChild(opt);
            el.value = 'Vazio';
            el.classList.add('vazio-flag-input');
        }
    });

    // Grupos de rádio sem seleção: "Vazio" ao lado
    const radioGroups = {};
    form.querySelectorAll('input[type="radio"]').forEach(r => {
        (radioGroups[r.name] = radioGroups[r.name] || []).push(r);
    });
    Object.keys(radioGroups).forEach(name => {
        const group = radioGroups[name];
        if (group.some(r => r.checked)) return;
        if (group.some(r => isCampoSolicitacao(r))) return;
        const container = group[0].closest('.form-group') || group[0].parentElement;
        if (container) {
            container.classList.add('missing-data');
            if (!container.querySelector('.vazio-flag')) {
                const span = document.createElement('span');
                span.className = 'vazio-flag';
                span.textContent = 'Vazio';
                span.classList.add('vazio-flag-text');
                container.appendChild(span);
            }
        }
    });

    // Checkboxes: "Vazio" apenas se nenhum estiver marcado no grupo/container
    const checkboxContainers = new Set();
    form.querySelectorAll('input[type="checkbox"]').forEach(el => {
        if (isCampoSolicitacao(el)) return;
        checkboxContainers.add(el.closest('.form-group') || el.parentElement);
    });

    checkboxContainers.forEach(container => {
        if (!container) return;
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const anyChecked = Array.from(checkboxes).some(el => el.checked);
        
        if (!anyChecked && !container.querySelector('.vazio-flag')) {
            container.classList.add('missing-data');
            const span = document.createElement('span');
            span.className = 'vazio-flag';
            span.textContent = 'Vazio';
            span.classList.add('vazio-flag-text');
            container.appendChild(span);
        }
    });

    // Bloqueia TODOS os campos, exceto os da solicitação de alteração
    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'hidden') return;
        if (isCampoSolicitacao(el)) return;
        
        if (el.type === 'radio' || el.type === 'checkbox') {
            el.readOnly = true; 
            el.addEventListener('click', (e) => e.preventDefault()); 
            el.classList.add('consulta-readonly');
        } else {
            el.disabled = true;
        }
    });
}

// Controle do Modal de Solicitação
window.openSolicitacaoModal = function(campoNome, valorAtual) {
    document.getElementById('modal-campo-nome').value = campoNome;
    document.getElementById('modal-valor-atual').value = valorAtual;
    document.getElementById('modal-novo-valor').value = valorAtual;
    document.getElementById('modal-justificativa').value = '';
    document.getElementById('modal-fundamentacao').value = '';
    document.getElementById('solicitacaoModal').style.display = 'flex';
}

window.closeSolicitacaoModal = function() {
    document.getElementById('solicitacaoModal').style.display = 'none';
}

window.submitSolicitacao = async function() {
    const rip = currentRip;
    const campoNome = document.getElementById('modal-campo-nome').value;
    const valorAtual = document.getElementById('modal-valor-atual').value;
    const novoValor = document.getElementById('modal-novo-valor').value.trim();
    const justificativa = document.getElementById('modal-justificativa').value.trim();
    const fundamentacao = document.getElementById('modal-fundamentacao').value.trim();

    if (!novoValor || !justificativa || !fundamentacao) {
        alert("Por favor, preencha a correção, a justificativa e a fundamentação legal.");
        return;
    }

    const payload = { rip, campo_nome: campoNome, valor_atual: valorAtual, novo_valor: novoValor, justificativa, fundamentacao };

    try {
        const response = await fetch('/api/solicitacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            alert('Solicitação de alteraçõesso para o Cadastro!');
            closeSolicitacaoModal();
        } else {
            alert('Erro ao salvar solicitação: ' + result.error);
        }
    } catch (err) {
        alert('Erro de comunicação com o servidor.');
        console.error(err);
    }
}

function popularFormulario(data) {
    const form = document.getElementById('form-diagnostico');
    const isConsulta = formMode === 'consulta';
    
    // Limpar visualizações antigas antes de repopular
    ['imagem', 'planta_pdf', 'planta_sei_pdf', 'vetorial'].forEach(key => {
        const listContainer = document.getElementById('file-list_' + key);
        if (listContainer) listContainer.innerHTML = '';
    });

    // Remover classes de missing-data anteriores
    form.querySelectorAll('.missing-data').forEach(el => el.classList.remove('missing-data'));

    // Preenche campos de endereço estruturados
    const addrFields = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'uf', 'cidade'];
    const hasAddrFields = addrFields.some(f => data[f] !== undefined && data[f] !== null && data[f] !== '');

    if (hasAddrFields) {
        // Dados individuais vindos do banco (modo antigo / SQLite local)
        addrFields.forEach(f => {
            const el = document.getElementById(f);
            if (el) {
                el.value = data[f] || '';
                if (data[f]) {
                    if (isConsulta) { el.readOnly = true; el.classList.add('consulta-readonly'); }
                } else if (isConsulta) {
                    el.classList.add('missing-data');
                }
            }
        });
    } else if (data.identificacao) {
        // Modo Supabase: identificacao vem como string única, decompor nos campos
        const fullAddr = data.identificacao;
        // Tenta extrair CEP
        const cepMatch = fullAddr.match(/CEP:\s*(\d{5}-?\d{3})/);
        if (cepMatch) {
            const cepEl = document.getElementById('cep');
            if (cepEl) { cepEl.value = cepMatch[1]; if (isConsulta) { cepEl.readOnly = true; cepEl.classList.add('consulta-readonly'); } }
        }
        // Remove CEP do texto para decompor o resto
        const addrWithoutCep = fullAddr.replace(/\s*-\s*CEP:\s*\d{5}-?\d{3}/, '').trim();
        // Tenta splitting por vírgula: "logradouro, numero, complemento, bairro, cidade, UF"
        const parts = addrWithoutCep.split(',').map(s => s.trim()).filter(Boolean);
        const setAddrField = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) { el.value = val; if (isConsulta) { el.readOnly = true; el.classList.add('consulta-readonly'); } }
        };
        if (parts.length >= 1) setAddrField('logradouro', parts[0]);
        if (parts.length >= 2) setAddrField('numero', parts[1]);
        if (parts.length >= 3) setAddrField('complemento', parts[2]);
        if (parts.length >= 4) setAddrField('bairro', parts[3]);
        if (parts.length >= 5) setAddrField('cidade', parts[4]);
        if (parts.length >= 6) setAddrField('uf', parts[5]);
    }

    if (hasAddrFields || data.identificacao) {
        // Desabilita botão de buscar CEP se veio da base
        const btnCep = document.getElementById('btn-buscar-cep');
        if (btnCep && isConsulta) {
            btnCep.disabled = true;
            btnCep.style.opacity = '0.5';
            btnCep.style.cursor = 'not-allowed';
        }
    }

    // Separa coordenadas em lat/lon se vierem juntas
    if (data.coordenadas) {
        const raw = data.coordenadas.trim();
        let lat = '', lon = '';
        const firstSegment = raw.split(',')[0].trim();

        // Polígono: "lat1 lon1, lat2 lon2, ..." — pega o primeiro ponto
        if (firstSegment.includes(' ')) {
            const point = firstSegment.split(/\s+/);
            lat = point[0] || '';
            lon = point[1] || '';
        } else {
            // Simples: "lat, lon"
            const parts = raw.split(',').map(s => s.trim());
            lat = parts[0] || '';
            lon = parts[1] || '';
        }

        const latEl = document.getElementById('coordenadas_lat');
        const lonEl = document.getElementById('coordenadas_lon');
        if (latEl && lat) {
            latEl.value = lat;
            if (isConsulta) {
                latEl.readOnly = true;
                latEl.classList.add('consulta-readonly');
            }
        }
        if (lonEl && lon) {
            lonEl.value = lon;
            if (isConsulta) {
                lonEl.readOnly = true;
                lonEl.classList.add('consulta-readonly');
            }
        }
    }

    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const value = data[key];
            const elements = form.elements[key];
            
            // Lógica especial para exibir links de arquivos anexados (arrays JSON)
            if (key === 'imagem' || key === 'planta_pdf' || key === 'planta_sei_pdf' || key === 'vetorial') {
                const listContainer = document.getElementById('file-list_' + key);
                // Procura o aviso de "nenhum arquivo" próximo ao campo
                const noFileMsg = document.querySelector(`[id="step-3"] [name="${key}"] + .no-file-msg`) || 
                                  document.querySelector(`[id="step-3"] input[name="${key}"] ~ .no-file-msg`) ||
                                  document.querySelector(`[id="step-3"] [name="${key}"]`)?.parentElement.querySelector('.no-file-msg');
                
                if (value && listContainer) {
                    try {
                        const fileArray = JSON.parse(value);
                        if (fileArray.length > 0) {
                            if (noFileMsg) noFileMsg.style.display = 'none';
                            fileArray.forEach(filePath => {
                                const filename = filePath.split(/[/\\]/).pop();
                                const viewUrl = '/' + filePath.replace(/\\/g, '/').replace(/^\/+/, '');
                                
                                const badge = document.createElement('div');
                                badge.style = "display: flex; align-items: center; gap: 8px; background: #e0f2fe; padding: 4px 8px; border-radius: 6px; border: 1px solid #7dd3fc;";
                                badge.innerHTML = `
                                    <span style="font-size: 13px; color: #0369a1; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${filename}</span>
                                    <a href="${viewUrl}" target="_blank" style="padding: 2px 6px; background: #0ea5e9; color: white; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: bold;">Ver ↗</a>
                                    ${formMode === 'edicao' ? `<button type="button" onclick="removerArquivoSalvo(this, '${key}')" style="padding: 2px 6px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;" title="Remover arquivo">✕</button>` : ''}
                                `;
                                listContainer.appendChild(badge);
                            });
                        } else {
                            if (noFileMsg) noFileMsg.style.display = 'block';
                        }
                    } catch (e) {
                        console.error('Erro ao fazer parse dos arquivos:', e);
                        if (noFileMsg) noFileMsg.style.display = 'block';
                    }
                } else if (noFileMsg) {
                    noFileMsg.style.display = 'block';
                }
                continue; // Pula para a próxima iteração, não tenta setar form.elements[key].value
            }

            if (elements) {
                const isEmpty = (value === null || value === undefined || value === '');

                // Se for um RadioNodeList (rádios ou checkboxes com mesmo nome)
                if (elements.length && !elements.type) { 
                    for (let i = 0; i < elements.length; i++) {
                        if (elements[i].type === 'radio' && elements[i].value == value) {
                            elements[i].checked = true;
                        } else if (elements[i].type === 'checkbox') {
                            elements[i].checked = (value == 1);
                        }
                    }
                    // Dado da base: bloqueia o grupo inteiro
                    if (!isEmpty && isConsulta) {
                        for (let i = 0; i < elements.length; i++) {
                            elements[i].classList.add('consulta-readonly');
                            elements[i].addEventListener('click', (e) => e.preventDefault());
                        }
                    }
                    // Para grupos de radio, destacamos o container se nada estiver selecionado
                    if (isEmpty && elements[0].type === 'radio' && isConsulta) {
                        const container = elements[0].closest('.form-group') || elements[0].parentElement;
                        if (container) container.classList.add('missing-data');
                    }
                } else {
                    // Input simples, textarea, select
                    if (elements.type === 'checkbox') {
                        elements.checked = (value == 1);
                        if (!isEmpty && isConsulta && !isCampoSolicitacao(elements)) {
                            elements.classList.add('consulta-readonly');
                            elements.addEventListener('click', (e) => e.preventDefault());
                        }
                    } else if (elements.type !== 'file') { // Evita setar valor de campo arquivo
                        elements.value = value !== null && value !== undefined ? value : '';
                        
                        if (isEmpty && isConsulta) {
                            elements.classList.add('missing-data');
                            elements.title = 'Este campo está vazio na base de dados';
                        } else if (isConsulta) {
                            // Dado da base: torna readonly com visual cinza
                            elements.readOnly = true;
                            elements.classList.add('consulta-readonly');
                        }
                    }
                }
            }
        }
    }
    
    // Dispara o evento 'change' nos radios/checkboxes para abrir/fechar campos condicionais corretamente
    const inputs = form.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    inputs.forEach(input => {
        const event = new Event('change');
        input.dispatchEvent(event);
    });
}

function handleFileUploadUI(inputElement, baseKey) {
    const listContainer = document.getElementById('file-list_' + baseKey);
    if (!listContainer) return;

    if (inputElement.files && inputElement.files.length > 0) {
        Array.from(inputElement.files).forEach(file => {
            const objectUrl = URL.createObjectURL(file);
            const badge = document.createElement('div');
            badge.style = "display: flex; align-items: center; gap: 8px; background: #dcfce7; padding: 4px 8px; border-radius: 6px; border: 1px solid #86efac;";
            badge.innerHTML = `
                <span style="font-size: 13px; color: #166534; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name} (Novo)</span>
                <a href="${objectUrl}" target="_blank" style="padding: 2px 6px; background: #22c55e; color: white; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: bold;">Ver ↗</a>
                <button type="button" onclick="this.parentElement.remove()" style="padding: 2px 6px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;" title="Remover arquivo">✕</button>
            `;
            listContainer.appendChild(badge);
        });
    }
}

// Controla a exibição do textarea/arquivos da solicitação com base no Sim/Não
window.toggleSolicitacaoCampos = function(radio) {
    const campos = document.getElementById('solicitacao_campos');
    if (campos) campos.style.display = (radio && radio.value === 'Sim') ? 'block' : 'none';
};

function handleSolicitacaoFileUploadUI(inputElement) {
    const listContainer = document.getElementById('file-list_solicitacao');
    if (!listContainer) return;

    if (inputElement.files && inputElement.files.length > 0) {
        Array.from(inputElement.files).forEach(file => {
            const objectUrl = URL.createObjectURL(file);
            const badge = document.createElement('div');
            badge.style = "display: flex; align-items: center; gap: 8px; background: #dcfce7; padding: 4px 8px; border-radius: 6px; border: 1px solid #86efac;";
            badge.innerHTML = `
                <span style="font-size: 13px; color: #166534; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name} (Novo)</span>
                <a href="${objectUrl}" target="_blank" style="padding: 2px 6px; background: #22c55e; color: white; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: bold;">Ver ↗</a>
                <button type="button" onclick="this.parentElement.remove()" style="padding: 2px 6px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;" title="Remover arquivo">✕</button>
            `;
            listContainer.appendChild(badge);
        });
    }
}

function renderSolicitacaoArquivos(fileListJson) {
    const container = document.getElementById('file-list_solicitacao');
    if (!container) return;
    container.innerHTML = '';
    if (!fileListJson) return;
    let arr = [];
    try { arr = JSON.parse(fileListJson); } catch (e) { return; }
    arr.forEach(filePath => {
        const filename = filePath.split(/[/\\]/).pop();
        const viewUrl = '/' + filePath.replace(/\\/g, '/').replace(/^\/+/, '');
        const badge = document.createElement('div');
        badge.style = "display: flex; align-items: center; gap: 8px; background: #f0fdf4; padding: 4px 8px; border-radius: 6px; border: 1px solid #bbf7d0;";
        badge.innerHTML = `
            <span style="font-size: 13px; color: #166534; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${filename}</span>
            <a href="${viewUrl}" target="_blank" style="padding: 2px 6px; background: #22c55e; color: white; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: bold;">Ver ↗</a>
        `;
        container.appendChild(badge);
    });
}

function removerArquivoSalvo(btn, fieldKey) {
    const badge = btn.parentElement;
    const filename = badge.querySelector('span').textContent;
    badge.remove();

    const hiddenInput = document.getElementById(fieldKey);
    if (hiddenInput && hiddenInput.value) {
        try {
            let arr = JSON.parse(hiddenInput.value);
            arr = arr.filter(fp => fp.split(/[/\\]/).pop() !== filename);
            hiddenInput.value = JSON.stringify(arr);
        } catch (e) {}
    }
}

// Aplica estilo customizado em todos os rádios e checkboxes
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll("input[type='radio'], input[type='checkbox']").forEach(el => {
        el.classList.add('form-custom-input');
    });
});
