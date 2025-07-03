export function genTAC(ast) {
  let tac = [];
  let tempCount = 1;
  let labelCount = 1;
  let argumentCount = 0;

  function newTemp() {
    if (tempCount === 7) {
      tempCount = 1; // Reseta o contador de temporários se atingir 7
    }
    return `t${tempCount++}`;
  }

  function newLabel(name = "L") {
    return `${name}${labelCount++}`;
  }

  function newArgument() {
    if (argumentCount === 7) {
      argumentCount = 0; // Reseta o contador de argumentos se atingir 7
    }
    return `a${argumentCount++}`;
  }

  function gen(node) {
    switch (node.type) {
      case 'NUMERO':
        return node;

      case 'NOME':
        const temp = newTemp();
        tac.push({
          exp: 'load',
          value: node.value,
          name: temp
        })
        return { type: 'TEMP', value: temp };

      case 'EXP_ARIT1':
      case 'EXP_ARIT2': {
        let temp;
        const left = gen(node.left);
        const right = gen(node.right);

        if (left.type === 'TEMP') {
          temp = left.value;
        } else {
          temp = newTemp();
        }
         
        tac.push({
          exp: 'arit',
          op: node.op,
          left: left,
          right: right,
          name: temp
        });
        return { type: 'TEMP', value: temp };
      }

      case 'EXP_DEC': {
        let value;
        if (node.value) {
          value = gen(node.value);
        } else {
          value = { type: 'NUMERO', value: '0' }; // Valor padrão se não houver inicialização
        }
        tac.push({
          exp: 'dec',
          name: node.name,
          value: value
        }); 
        return;
      }

      case 'EXP_ATRIB': {
        const value = gen(node.value);

        if(value.type === 'NUMERO') {
          const temp = newTemp();

          tac.push({
            exp: 'init',
            name: temp,
            value: node.name
          })
          
          tac.push({
            exp: 'atrib',
            name: temp,
            value: value
          });

        } else {
          tac.push({
            exp: 'atrib',
            name: node.name,
            value: value
          });

        }

        return;
      }

      case 'EXP_LOG': {
        const left = gen(node.left);
        const right = gen(node.right);
        const temp = newTemp();
      
        tac.push({
          exp: 'log',
          op: node.op,
          left,
          right,
          temp
        });
      
        return { type: 'TEMP', value: temp };
      }      

      case 'EXP_REL': {
        const left = gen(node.left);
        const right = gen(node.right);
        const temp = newTemp();
      
        tac.push({
          exp: 'rel',
          op: node.op,
          left,
          right,
          temp
        });
      
        return { type: 'TEMP', value: temp };
      }

      case 'EXP_NOT': {
        const value = gen(node.value);
        const temp = newTemp();
      
        tac.push({
          exp: 'not',
          value,
          temp
        });
      
        return { type: 'TEMP', value: temp };
      }      

      case 'EXP_COND': {
        const ifLabel = newLabel("if_body");
        const elseLabel = node.elseBody ? newLabel("else_body") : null;
        const endLabel = newLabel("if_end");

        // Gera o código para a condição
        const temp = gen(node.condition);

        tac.push({
          exp: 'if_cond',
          temp: temp.value,
          goto: ifLabel
        });

        tac.push({
          exp: 'jump',
          name: elseLabel ?? endLabel
        });

        tac.push({ exp: 'label', name: ifLabel });

        // Gera o código para o corpo do if
        for (const exp of node.body) {
          gen(exp);
        }

        if (node.elseBody) {

          tac.push({ exp: 'jump', name: endLabel });

          tac.push({ exp: 'label', name: elseLabel });

          for (const exp of node.elseBody) {
            gen(exp);
          }
          
        }

        // Se houver um else, gera o código para ele
        tac.push({ exp: 'label', name: endLabel }); 

        return;
      }

      case 'EXP_LOOP': {
        const startLabel = newLabel("loop_start");
        const condLabel = newLabel("loop_cond");

        if (node.loopType == 'for') {
          // Inicialização
          gen(node.init);

          tac.push({ exp: 'jump', name: condLabel });

          tac.push({ exp: 'label', name: startLabel });

          // Corpo do loop
          gen(node.body);

          // Incremento
          gen(node.increment);

          tac.push({ exp: 'label', name: condLabel });
          // Condição
          const temp = gen(node.condition);
          tac.push({
            exp: 'loop_cond',
            temp,
            goto: startLabel
          });

        }

        return;
      }

      case 'EXP_CALL_FUNC': {
        const name = node.name;
        const funcLabel = "func_" + name;

        // Gera os argumentos (na ordem esperada)
        for (const arg of node.args) {
          const argument = newArgument();
          if (arg.type === 'NUMERO') {
            tac.push({ exp: 'param', argument, value: arg });
          } else {
            tac.push({ exp: 'param', argument, value: arg });
          }
        }

        argumentCount = 0; // Reseta o contador de argumentos

        tac.push({ exp: 'call', name: funcLabel });

        return { type: 'ARGUMENT', value: 'a0' }; // Retorna um novo argumento para o resultado da chamada
      }

      case 'EXP_FUNC': {
        const name = node.name;
        const funcLabel = "func_" + name;
        const endLabel = newLabel("func_end");

        tac.push({ exp: 'jump' , name: endLabel });
        tac.push({ exp: 'label', name: funcLabel });

        if (node.params) {
          // Atribui os parâmetros a variáveis locais
          for (let i = 0; i < node.params.length; i++) {
            const paramName = node.params[i].name;
            const temp = `a${i}`;
            tac.push({ exp: 'dec', name: paramName, value: { type: 'NUMERO', value: '0' }});
            tac.push({ exp: 'atrib', name: paramName, value: { type: 'TEMP', value: temp }});
          }
        }

        // Gera o código para o corpo da função
        for (const exp of node.body) {
          gen(exp);
        }

        tac.push({ exp: 'ret' });

        tac.push({ exp: 'label', name: endLabel });

        return;
      }

      case 'RETURN': {
        const result = gen(node.value); // gera o valor de retorno (pode ser uma variável ou expressão)
      
        tac.push({
          exp: 'return',
          argument: newArgument(), // cria um novo argumento para o retorno
          value: result // pode ser t1, t2, etc.
        });

        argumentCount = 0;
      
        return;
      }

      case 'PROG':
        for (const exp of node.body) {
          gen(exp);
        }
        return;
    }
  }

  gen(ast);
  return tac;
}

export function printTAC(tac) {
  console.log("🔸 TAC:");
  for (const instr of tac) {
    if (instr.exp === 'dec') {
      console.log(`${instr.name} = ${instr.value.value}`);
    } else if (instr.exp === 'atrib') {
      console.log(`${instr.name} = ${instr.value.value}`);
    } else if (instr.exp === 'arit') {
      console.log(`${instr.name} = ${instr.left.value} ${instr.op} ${instr.right.value}`);
    } else if (instr.exp === 'load') {
      console.log(`${instr.name} = ${instr.value}`);
    } else if (instr.exp === 'init') {
      console.log(`${instr.name} = ${instr.value}`);

    } else if (instr.exp === 'label') {
      console.log(`${instr.name}`);
    } else if (instr.exp === 'jump') {
      console.log(`jump ${instr.name}`);
    } else if (instr.exp === 'if_cond') {
      console.log(`if ${instr.temp} goto ${instr.goto}`);
    } else if (instr.exp === 'loop_cond') {
      console.log(`for ${instr.temp} goto ${instr.goto}`);
    } else if (instr.exp === 'log') {
      console.log(`${instr.temp} = ${instr.left.value} ${instr.op} ${instr.right.value}`);
    } else if (instr.exp === 'return') {
      console.log(`return ${instr.value.value}`);
    } else if (instr.exp === 'ret') {
      console.log('ret');
    } else if (instr.exp === 'call') {
      console.log(`call ${instr.name}`);
    } else if (instr.exp === 'param') {
      console.log(`parametro ${instr.argument}: ${instr.value.value}`);
    } else if (instr.exp === 'rel') {
      console.log(`${instr.temp} = ${instr.left.value} ${instr.op} ${instr.right.value}`);
    } else if (instr.exp === 'not') {
      console.log(`${instr.temp} = !${instr.value.value}`);
    } else {
      console.log("// Instrução desconhecida:", instr);
    }
  }
}

