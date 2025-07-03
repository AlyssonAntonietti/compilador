class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.current = 0;
    }

    peek() {
        return this.tokens[this.current] || null;
    }

    consume(type) {
        if (this.peek() && this.peek().type === type) {
            return this.tokens[this.current++];
        }
        throw new Error(`Erro de sintaxe: esperado ${type}, encontrado ${this.peek()?.value}`);
    }

    parsePROG() {
        let nodes = [];
    
        while (this.peek() && this.peek().value !== '}') {
            nodes.push(this.parseEXP());
        }
    
        return { type: 'PROG', body: nodes };
    }

    parseEXP() {
        if (this.peek().type === 'KEYWORD') {
            const type = this.peek().value;
            const next1 = this.tokens[this.current + 1];
            const next2 = this.tokens[this.current + 2];
    
            if (['int', 'float', 'string', 'void'].includes(type)) {
                if (next1?.type === 'IDENTIFIER' && next2?.value === '(') {
                    return this.parseEXP_FUNC(); // <- função
                }
                return this.parseEXP_DEC(); // <- variável
            }
    
            if (this.peek().value === 'if') return this.parseEXP_COND();
            if (this.peek().value === 'while' || this.peek().value === 'for') return this.parseEXP_LOOP();
        }
    
        if (this.peek().type === 'IDENTIFIER') {
            const next = this.tokens[this.current + 1];
            if (next?.type === 'SYMBOL' && next.value === '(') {
                return this.parseEXP_CALL_FUNC();
            }
            return this.parseEXP_ATRIB();
        }
    
        throw new Error(`Erro de sintaxe: expressão inesperada ${this.peek()?.value}`);
    }

    parseEXP_DEC() {
        let type = this.consume('KEYWORD').value;
        let name = this.consume('IDENTIFIER').value;
        
        if (this.peek() && this.peek().value === '=') {
            this.consume('OPERATOR');
    
            let value;
            
            if (this.peek().type === 'STRING') {
                // Remove as aspas
                value = { type: 'STRING', value: this.consume('STRING').value.slice(1, -1) };
            } else {
                value = this.parseEXP_ARIT1();
            }
            
            this.consume('SYMBOL', ';');
            
            return { type: 'EXP_DEC', varType: type, name, value };
        }
    
        this.consume('SYMBOL', ';');
        return { type: 'EXP_DEC', varType: type, name };
    }

    parseEXP_ATRIB() {
        let name = this.consume('IDENTIFIER').value;
        let op = this.consume('OPERATOR').value;
      
        let value;
        if (this.peek().type === 'IDENTIFIER' && this.tokens[this.current + 1]?.value === '(') {
          // chamada de função numa atribuição: y = func(...)
          value = this.parseEXP_CALL_FUNC();
          value.assignTo = name; // marca para atribuir o resultado
        } else {
          if (this.peek().type === 'STRING') {
            value = { type: 'STRING', value: this.consume('STRING').value.slice(1, -1) };
          } else {
            value = this.parseEXP_ARIT1();
          }
          this.consume('SYMBOL', ';');
        }
      
        return { type: 'EXP_ATRIB', name, op, value };
      }

    parseEXP_COND() {
        this.consume('KEYWORD'); // Consome 'if'
        this.consume('SYMBOL');  // Consome '('
        let condition = this.parseEXP_LOG(); // Analisa a condição lógica
        this.consume('SYMBOL');  // Consome ')'
        this.consume('SYMBOL');  // Consome '{'
    
        let body = [];
        while (this.peek() && this.peek().value !== '}') {
            body.push(this.parseEXP());
        }
    
        this.consume('SYMBOL');  // Consome '}'
    
        let elseBody = null;
        if (this.peek() && this.peek().value === 'else') {
            this.consume('KEYWORD');  // Consome 'else'
            this.consume('SYMBOL');  // Consome '{'
            
            elseBody = [];
            while (this.peek() && this.peek().value !== '}') {
                elseBody.push(this.parseEXP());
            }
    
            this.consume('SYMBOL');  // Consome '}'
        }
    
        return { type: 'EXP_COND', condition, body, elseBody };
    }

    parseEXP_LOOP() {
        let loopType = this.consume('KEYWORD').value; // 'for' ou 'while'
    
        if (loopType === 'for') {
            this.consume('SYMBOL', '(');
    
            // Inicialização: pode ser declaração ou atribuição
            let init = null;
            if (this.peek().type === 'KEYWORD') {
                init = this.parseEXP_DEC();
            } else if (this.peek().type === 'IDENTIFIER') {
                init = this.parseEXP_ATRIB(); // Aqui consome o ';'
            }
    
            // Condição
            let condition = null;
            if (this.peek().value !== ';') {
                condition = this.parseEXP_LOG();
            }
            this.consume('SYMBOL', ';');
    
            // Incremento
            let increment = null;
            if (this.peek().value !== ')') {
                increment = this.parseEXP_ATRIB(false); // Não consome ';'
            }
            this.consume('SYMBOL', ')');
    
            // Corpo do laço
            this.consume('SYMBOL', '{');
            let body = this.parsePROG(); // Deve parar no '}'
            this.consume('SYMBOL', '}');
    
            return {
                type: 'EXP_LOOP',
                loopType: 'for',
                init,
                condition,
                increment,
                body
            };
    
        } else if (loopType === 'while') {
            this.consume('SYMBOL', '(');
            let condition = this.parseEXP_LOG();
            this.consume('SYMBOL', ')');
    
            this.consume('SYMBOL', '{');
            let body = this.parsePROG(); // Deve parar no '}'
            this.consume('SYMBOL', '}');
    
            return {
                type: 'EXP_LOOP',
                loopType: 'while',
                condition,
                body
            };
    
        } else {
            throw new Error(`Tipo de laço inválido: ${loopType}`);
        }
    }    
    
    parseEXP_FUNC() {

        let returnType = this.consume('KEYWORD').value; // 'int', 'float', 'string', 'void'
        console.log('returnType', returnType);
        let name = this.consume('IDENTIFIER').value;
        this.consume('SYMBOL', '('); // Consome '('
    
        let params = [];
    
        while (this.peek() && this.peek().value !== ')') {
            // Ex: int a
            let varType = this.consume('KEYWORD').value; // 'int' ou 'string'
            let varName = this.consume('IDENTIFIER').value;
    
            params.push({ name: varName, varType });
    
            // Se houver vírgula, consome e continua
            if (this.peek().value === ',') {
                this.consume('SYMBOL'); // consome ','
            } else {
                break;
            }
        }
    
        this.consume('SYMBOL', ')'); // Consome ')'
        this.consume('SYMBOL', '{'); // Consome '{'
    
        let body = [];
        while (this.peek() && this.peek().value !== '}') {
            if (this.peek().value === 'return') {
                body.push(this.parseEXP_RETURN());
            } else {
                body.push(this.parseEXP());
            }
        }
    
        this.consume('SYMBOL', '}'); // Consome '}'
    
        return {
            type: 'EXP_FUNC',
            returnType, // tipo de retorno da função
            name,
            params, // novos parâmetros tipados
            body
        };
    }
    
    parseEXP_RETURN() {
        this.consume('KEYWORD', 'return');
        let value = this.parseEXP_ARIT1();
        this.consume('SYMBOL', ';');
        return { type: 'RETURN', value };
    }

    parseEXP_CALL_FUNC() {
        let name = this.consume('IDENTIFIER').value;
        this.consume('SYMBOL', '(');
    
        let args = [];
    
        while (this.peek() && this.peek().value !== ')') {
            args.push(this.parseEXP_ARIT1()); // Pode ser número, nome de variável, etc.
    
            if (this.peek().value === ',') {
                this.consume('SYMBOL'); // consome ','
            } else {
                break;
            }
        }
    
        this.consume('SYMBOL', ')');
        this.consume('SYMBOL', ';');
    
        return {
            type: 'EXP_CALL_FUNC',
            name,
            args 
        };
    }
    
    parseEXP_LOG() {
        let left = this.parseEXP_REL();
    
        while (this.peek() && (this.peek().value === '&&' || this.peek().value === '||')) {
            let op = this.consume('OPERATOR').value;
            let right = this.parseEXP_REL();
            left = { type: 'EXP_LOG', left, op, right };
        }
    
        return left;
    }    

    parseEXP_REL() {
        let left = this.parseEXP_NOT();
    
        if (this.peek() && ['==', '!=', '<', '<=', '>', '>='].includes(this.peek().value)) {
            let op = this.consume('OPERATOR').value;
            let right = this.parseEXP_NOT();
            return { type: 'EXP_REL', left, op, right };
        }
    
        return left;
    }

    parseEXP_NOT() {
        if (this.peek() && this.peek().value === '!') {
            this.consume('OPERATOR', '!'); // Consome '!'
            const expr = this.parseEXP_NOT();
            return { type: 'EXP_NOT', value: expr };
        }
    
        return this.parseEXP_ARIT1(); // Ou lógica booleana de nível mais baixo
    }

    parseVALOR() {
        if (this.peek().type === 'INTEGER') {
            return { type: 'NUMERO', value: this.consume('INTEGER').value };
        } else if (this.peek().type === 'IDENTIFIER') {
            return { type: 'NOME', value: this.consume('IDENTIFIER').value };
        }
        throw new Error(`Erro de sintaxe: valor inválido ${this.peek()?.value}`);
    }    

    parseEXP_ARIT1() {
        let left = this.parseEXP_ARIT2();
        while (this.peek() && ['+', '-'].includes(this.peek().value)) {
            let op = this.consume('OPERATOR').value;
            let right = this.parseEXP_ARIT2();
            left = { type: 'EXP_ARIT1', left, op, right }; // TODO: tratar string paraa permiitir concatenação
        }
        return left;
    }

    parseEXP_ARIT2() {
        let left = this.parseEXP_ARIT3();
        while (this.peek() && ['*', '/'].includes(this.peek().value)) {
            let op = this.consume('OPERATOR').value;
            let right = this.parseEXP_ARIT3();
            left = { type: 'EXP_ARIT2', left, op, right };
        }
        return left;
    }

    parseEXP_ARIT3() {
        if (this.peek().value === '(') {
            this.consume('SYMBOL'); // Consome '('
            let exp = this.parseEXP_ARIT1(); // ou parseEXP_LOG, se quiser lógica
            this.consume('SYMBOL'); // Consome ')'
            return exp;
        } else if (this.peek().type === 'INTEGER') {
            return { type: 'NUMERO', value: this.consume('INTEGER').value };
        } else if (this.peek().type === 'STRING') {
            return { type: 'STRING', value: this.consume('STRING').value.slice(1, -1) };
        } else if (this.peek().type === 'IDENTIFIER') {
            const nextToken = this.tokens[this.current + 1];

            if (nextToken && nextToken.value === '(') {
                let name = this.consume('IDENTIFIER').value;
                this.consume('SYMBOL', '(');
            
                let args = [];
            
                while (this.peek() && this.peek().value !== ')') {
                    args.push(this.parseEXP_ARIT1()); // Pode ser número, nome de variável, etc.
            
                    if (this.peek().value === ',') {
                        this.consume('SYMBOL'); // consome ','
                    } else {
                        break;
                    }
                }
            
                this.consume('SYMBOL', ')');
            
                return {
                    type: 'EXP_CALL_FUNC',
                    name,
                    args 
                };
            }

            return { type: 'NOME', value: this.consume('IDENTIFIER').value };
        }
        throw new Error(`Erro de sintaxe: expressão aritmética inválida ${this.peek()?.value}`);
    }
}

export function parse(tokens) {
    const parser = new Parser(tokens);
    return parser.parsePROG();
}