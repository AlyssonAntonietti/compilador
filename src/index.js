import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyze } from './semantic.js';
import { genTAC, printTAC } from './utils/tacGeneration.js';
import { assemblyGenerator } from './utils/assemblyGeneration.js';

const code = `
    int x = 5;
    int soma(int a, int b) {
        return a + b;
    }
    int resultado;
    resultado = 4 + soma(x, 10);  
`;

const tokensList = tokenize(code);
const ast = parse(tokensList);

console.log('🔸 AST:', JSON.stringify(ast, null, 2));

let erro = false;

try {
    analyze(ast, );
    console.log('✅ Análise semântica concluída com sucesso!');

} catch (error) {
    console.error('❌ Erro semântico:', error.message);
    erro = true;
}

if (!erro) {
    try {
        const tac = genTAC(ast);
        console.log(tac);
        printTAC(tac);
        try {
            const assembly = assemblyGenerator(tac);
            console.log('🔸 Assembly:\n', assembly);
        } catch (error) {
            console.error('❌ Erro na geração do Assembly:', error.message, error.stack);
        }
    } catch (error) {
        console.error('❌ Erro na geração de TAC:', error.message, error.stack);
    }
}

// const code = `
//     int x = 10;
//     if (x < 20) {
//         x += 5;
//     } else {
//         x = 0;
//     }
//     function soma() {
//         return x;
//     }
//     while (x > 0) {
//         x += 1;
//     }
//     for (int i = 0; i < 10; i += 1) {
//         x += i;
//     }   
// `;