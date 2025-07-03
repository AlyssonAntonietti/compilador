import { SymbolTable } from './utils/symbolTable.js';

export function analyze(node, table = new SymbolTable()) {
    switch (node.type) {
        case 'PROG':
            for (const exp of node.body) {
                analyze(exp, table);
            }
            break;
            
        case 'EXP_DEC':
            table.declare(node.name, node.varType);

            if (node.value) {
                const valueType = inferType(node.value, table);
                if (node.varType !== valueType) {
                    throw new Error(`Erro semântico: variável '${node.name}' do tipo '${node.varType}' não pode ser inicializada com um valor do tipo '${valueType}'.`);
                }
                analyze(node.value, table);
            }
            break;

        case 'EXP_ATRIB': {
            const symbol = table.lookup(node.name);
            if (!symbol) {
                throw new Error(`Erro: variável '${node.name}' não declarada.`);
            }
        
            const valueType = inferType(node.value, table);
            if (symbol.type !== valueType) {
                throw new Error(`Erro semântico: variável '${node.name}' do tipo '${symbol.type}' não pode ser atribuída a um valor do tipo '${valueType}'.`);
            }
        
            analyze(node.value, table);
            break;
        }

        case 'EXP_ARIT1':
        case 'EXP_ARIT2':
            analyze(node.left, table);
            analyze(node.right, table);
            break;

        case 'EXP_LOG':
            analyze(node.left, table);
            analyze(node.right, table);
            break;

        case 'EXP_REL':
            analyze(node.left, table);
            analyze(node.right, table);
            break;

        case 'EXP_NOT':
            analyze(node.value, table);
            break;

        case 'NOME':
            if (!table.lookup(node.value)) {
                throw new Error(`Erro: variável '${node.value}' não foi declarada.`);
            }
            break;

        case 'NUMERO':
            break;

        case 'STRING':
            break;

        case 'EXP_COND':
            analyze(node.condition, table);
            const condTable = new SymbolTable(table);
            for (const cond of node.body.body || node.body) {
                analyze(cond, condTable);
            }
            if (node.elseBody) {
                const elseTable = new SymbolTable(table);
                for (const cond of node.elseBody) {
                    analyze(cond, elseTable);
                }
            }
            break;

        case 'EXP_LOOP':
            const loopTable = new SymbolTable(table); // Cria escopo local do loop
        
            if (node.init) {
                analyze(node.init, loopTable); // Analisa a declaração 'int i = 0'
            }
        
            if (node.condition) {
                analyze(node.condition, loopTable); // Analisa 'i < 10'
            }
        
            if (node.increment) {
                analyze(node.increment, loopTable); // Analisa 'i += 1'
            }
        
            if (node.body && node.body.body) {
                for (const loop of node.body.body) {
                    analyze(loop, loopTable); // Analisa o corpo do loop usando escopo com 'i'
                }
            }
            break;

        case 'EXP_FUNC':
            if (table.lookup(node.name)) {
                throw new Error(`Função '${node.name}' já foi declarada.`);
            }
            // Salva a função com tipo 'function' e a lista de parâmetros
            table.declare(node.name, 'function', {
                params: node.params, // parametros da função
                returnType: node.returnType
            });
            const funcTable = new SymbolTable(table);
            // Declara os parâmetros da função na tabela local
            if (node.params) {
                for (const param of node.params) {
                    funcTable.declare(param.name, param.varType);
                }
            }
            for (const loop of node.body) {
                analyze(loop, funcTable);
            }
            break;    

        case 'RETURN':
            analyze(node.value, table);
            
            // Verificando se o valor do retorno é uma variável não declarada
            if (node.value.type === 'NOME' && !table.lookup(node.value.value)) {
                throw new Error(`Erro semântico: variável '${node.value.value}' usada no return não foi declarada.`);
            }
            break;

        case 'EXP_CALL_FUNC':
            const func = table.lookup(node.name);
            if (!func) {
                throw new Error(`Função '${node.name}' não foi declarada.`);
            }
            if (func.type !== 'function') {
                throw new Error(`Identificador '${node.name}' não é uma função.`);
            }
             // Verifica número de argumentos
            if (node.args.length !== func.params.length) {
                throw new Error(`Função '${node.name}' espera ${func.params.length} argumento(s), mas recebeu ${node.args.length}.`);
            }

            // Verifica tipos dos argumentos
            for (let i = 0; i < node.args.length; i++) {
                const expectedType = func.params[i].varType;
                const actualType = inferType(node.args[i], table);

                if (actualType !== expectedType) {
                    throw new Error(
                        `Tipo do argumento ${i + 1} na chamada de '${node.name}' incorreto. Esperado '${expectedType}', recebido '${actualType}'.`
                    );
                }
            }
            break;

        default:
            throw new Error(`Análise semântica não implementada para tipo: ${node.type}`);
    }
}

function inferType(node, table) {
    switch (node.type) {
        case 'NUMERO':
            return 'int';
        case 'STRING':
            return 'string';
        case 'NOME': {
            const symbol = table.lookup(node.value);
            if (!symbol) {
                throw new Error(`Erro semântico: variável '${node.value}' não foi declarada.`);
            }
            return symbol.type;
        }
        case 'EXP_ARIT1':
        case 'EXP_ARIT2': {
            const left = inferType(node.left, table);
            const right = inferType(node.right, table);
            if (node.op === '+') {
                if (left === 'int' && right === 'int') {
                    return 'int';
                } else if (left === 'string' && right === 'string') {
                    return 'string';
                } else {
                    throw new Error(`Erro semântico: '+' não é válido entre '${left}' e '${right}'.`);
                }
            }
            if (left !== 'int' || right !== 'int') {
                throw new Error(`Erro semântico: operação aritmética requer operandos do tipo 'int', mas recebeu '${left}' e '${right}'.`);
            }
            return 'int';
        }
        case 'EXP_REL': {
            const left = inferType(node.left, table);
            const right = inferType(node.right, table);

            if (left !== right) {
                throw new Error(`Erro semântico: comparação entre tipos incompatíveis '${left}' e '${right}'.`);
            }

            return 'bool';
        }

        case 'EXP_LOG': {
            const left = inferType(node.left, table);
            const right = inferType(node.right, table);

            if (left !== 'bool' || right !== 'bool') {
                throw new Error(`Erro semântico: operadores lógicos requerem booleanos. Recebido '${left}' e '${right}'.`);
            }

            return 'bool';
        }

        case 'EXP_NOT': {
            const valueType = inferType(node.value, table);
            if (valueType !== 'bool') {
                throw new Error(`Erro semântico: negação '!' requer expressão do tipo 'bool', mas recebeu '${valueType}'.`);
            }
            return 'bool';
        }

        case 'EXP_CALL_FUNC': {
            const func = table.lookup(node.name);
            if (!func) {
                throw new Error(`Função '${node.name}' não foi declarada.`);
            }
            if (func.type !== 'function') {
                throw new Error(`Identificador '${node.name}' não é uma função.`);
            }
             // Verifica número de argumentos
            if (node.args.length !== func.params.length) {
                throw new Error(`Função '${node.name}' espera ${func.params.length} argumento(s), mas recebeu ${node.args.length}.`);
            }

            // Verifica tipos dos argumentos
            for (let i = 0; i < node.args.length; i++) {
                const expectedType = func.params[i].varType;
                const actualType = inferType(node.args[i], table);

                if (actualType !== expectedType) {
                    throw new Error(
                        `Tipo do argumento ${i + 1} na chamada de '${node.name}' incorreto. Esperado '${expectedType}', recebido '${actualType}'.`
                    );
                }
            }
            
            return func.returnType;
        }        

        default:
            throw new Error(`Erro semântico: tipo da expressão '${node.type}' não suportado para inferencia.`);
    }
}