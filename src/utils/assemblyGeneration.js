export function assemblyGenerator(tac) {
    
    let dataSection = `.data\n`;
    let textSection = `.text\nmain:\n`;
    let labelSection = ``;
    let insideMain = true;
  
    // Seção .data
    for (const instr of tac) {
      if (instr.exp === 'dec') {
        if (instr.value.type === 'TEMP') {
          dataSection += `    ${instr.name}: .word 0\n`;
        } else {
          dataSection += `    ${instr.name}: .word ${instr.value.value}\n`;
        }
      }
    }

    // Helper para escrever no bloco correto
    const write = (line, isLabel = false) => {
      if (isLabel || !insideMain) {
        labelSection += line;
      } else {
        mainSection += line;
      }
    };
  
    // Seção .text
    for (const instr of tac) {
      if (instr.exp === 'arit') {
        const { op, left, right, name } = instr;
        const opInstr = op === '+' ? 'add' :
                        op === '-' ? 'sub' :
                        op === '*' ? 'mul' :
                        op === '/' ? 'div' : 'nop';
  
        // Carrega left
        if (left.type === 'NUMERO') {
            textSection += `    li ${name}, ${left.value}\n`;
        }
        
        // Operação com right
        if (right.type === 'NUMERO' && op === '+') {
            // Usa addi se possível
            textSection += `    addi ${name}, ${name}, ${right.value}\n`;
        } else {
            // Se right é número e não é add, precisa carregar em registrador temporário
            if (right.type === 'NUMERO') {
            textSection += `    li t0, ${right.value}\n`;
            textSection += `    ${opInstr} ${name}, ${name}, t0\n`;
            } else {
            // right é TEMP ou variável, usa diretamente
            textSection += `    ${opInstr} ${name}, ${name}, ${right.value}\n`;
            }
        }
  
      } else if (instr.exp === 'log') {
        let { op, left, right, temp } = instr;
        
        if (left.type === 'NUMERO') {
          textSection += `    li t0, ${left.value}\n`;
          left = 't0';
        } else { left = left.value}

        if (right.type === 'NUMERO') {
          textSection += `    li ${temp}, ${right.value}\n`;
          right = temp;
        } else {
          right = right.value;
        }  

        switch (op) {
          case '&&':
            textSection += `    and ${temp}, ${left}, ${right}\n`;
            break;
          case '||':
            textSection += `    or ${temp}, ${left}, ${right}\n`;
            break;
        }

      } else if (instr.exp === 'not') {
        if (instr.value.type === 'NUMERO') {
          textSection += `li t0, ${instr.value.value}`;
        } 
        textSection += `    seqz ${instr.temp}, t1\n`;
      
      } else if (instr.exp === 'rel') {
        let { op, left, right, temp } = instr;
        
        if (left.type === 'NUMERO') {
          textSection += `    li t0, ${left.value}\n`;
          left = 't0';
        } else { left = left.value}

        if (right.type === 'NUMERO') {
          textSection += `    li ${temp}, ${right.value}\n`;
          right = temp;
        } else {
          right = right.value;
        }

        switch (op) {
          case '==':
            textSection += `    sub t0, ${left}, ${right}\n`;
            textSection += `    seqz ${temp}, t0\n`;
            break;
          case '!=':
            textSection += `    sub t0, ${left}, ${right}\n`;
            textSection += `    snez ${temp}, t0\n`;
            break;
          case '<':
            textSection += `    slt ${temp}, ${left}, ${right}\n`;
            break;
          case '>':
            textSection += `    slt ${temp}, ${right}, ${left}\n`;
            break;
          case '<=':
            textSection += `    slt t0, ${right}, ${left}\n`;
            textSection += `    xori ${temp}, t0, 1\n`;
            break;
          case '>=':
            textSection += `    slt t0, ${left}, ${right}\n`;
            textSection += `    xori ${temp}, t0, 1\n`;
            break;
        }
          

      } else if (instr.exp === 'if_cond') {
        textSection += `    bnez ${instr.temp}, ${instr.goto}\n`;
      } else if (instr.exp === 'loop_cond') {
        textSection += `    bnez ${instr.temp}, ${instr.goto}\n`;
      } else if (instr.exp === 'label') {
        textSection += `${instr.name}:\n`;
      } else if (instr.exp === 'jump') {
        textSection += `    j ${instr.name}\n`;

      } else if (instr.exp === 'atrib') {

        if (instr.value.type === 'NUMERO') {
          textSection += `    li ${instr.name}, ${instr.value.value}\n`;
          textSection += `    sw ${instr.name}, (t0)\n`;
        } else {
          textSection += `    la t0, ${instr.name}\n`;
          textSection += `    sw ${instr.value.value}, (t0)\n`;
        }
      } else if (instr.exp === 'load') {
          textSection += `    la t0, ${instr.value}\n`;
          textSection += `    lw ${instr.name}, (t0)\n`;
      } else if (instr.exp === 'init') {
          textSection += `    la t0, ${instr.value}\n`;
      } else if (instr.exp === 'ret') {
          textSection += `    jr ra\n`;
      } else if (instr.exp === 'call') {
          textSection += `    jal ra, ${instr.name}\n`;
      } else if (instr.exp === 'param') {
        if (instr.value.type === 'NOME') {
          textSection += `    la t0, ${instr.value.value}\n`;
          textSection += `    lw ${instr.argument}, (t0)\n`;
        } else {
          textSection += `    li ${instr.argument}, ${instr.value.value}\n`;
        }
      } else if (instr.exp === 'return') {
          if (instr.value.type === 'TEMP') {
            textSection += `    mv ${instr.argument}, ${instr.value.value}\n`;
          } else {
            textSection += `    li ${instr.argument}, ${instr.value.value}\n`;
          }
      }
    }
  
    return dataSection + '\n' + textSection;
  }
  