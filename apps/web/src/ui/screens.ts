export function renderLoading(root: HTMLElement, message: string): void {
  const screen = document.createElement('section');
  screen.className = 'status-screen';

  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.setAttribute('aria-hidden', 'true');

  const text = document.createElement('p');
  text.className = 'status-screen__text';
  text.textContent = message;

  screen.append(spinner, text);
  root.replaceChildren(screen);
}

export function renderFatalError(
  root: HTMLElement,
  message: string,
  onRetry: () => void
): void {
  const screen = document.createElement('section');
  screen.className = 'status-screen';

  const title = document.createElement('h2');
  title.className = 'status-screen__title';
  title.textContent = 'Servidor indisponível';

  const text = document.createElement('p');
  text.className = 'status-screen__text';
  text.textContent = message;

  const button = document.createElement('button');
  button.className = 'primary-button';
  button.type = 'button';
  button.textContent = 'Tentar novamente';
  button.addEventListener('click', onRetry);

  const hint = document.createElement('p');
  hint.className = 'status-screen__hint';
  hint.textContent =
    'O plano gratuito do Render suspende a API após alguns minutos sem uso. A primeira resposta pode levar até um minuto.';

  screen.append(title, text, button, hint);
  root.replaceChildren(screen);
}
