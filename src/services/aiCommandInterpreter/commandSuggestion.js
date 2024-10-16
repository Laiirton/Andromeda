export async function suggestCommand(interpretation, senderName) {
  if (!interpretation || !interpretation.command) {
    return "Desculpe, não entendi sua intenção. Pode reformular ou usar um comando direto?";
  }

  const { command, args, confidence } = interpretation;
  
  if (confidence < 70) {
    return `Não tenho certeza, mas acho que você quer usar o comando '${command}'. Está correto?`;
  }

  const argsString = args.length > 0 ? ' ' + args.join(' ') : '';
  const suggestion = `Parece que você quer usar o comando: !${command}${argsString}\n\nDeseja que eu execute este comando para você?`;

  return suggestion;
}
