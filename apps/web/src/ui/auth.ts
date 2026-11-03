export type AuthMode = 'login' | 'register';

export function renderAuthScreen(
  root: HTMLElement,
  onSubmit: (mode: AuthMode, email: string, password: string) => Promise<void>
): void {
  root.replaceChildren();
  const screen = document.createElement('section');
  screen.className = 'auth-screen';
  screen.innerHTML = `
    <div class="auth-card">
      <div class="auth-mark">MP</div>
      <p class="auth-eyebrow">MUNDO PERFEITO IDLE</p>
      <h1 id="auth-title">Entre no mundo</h1>
      <p class="auth-subtitle">Salve sua jornada e continue de onde parou.</p>
      <div class="auth-tabs">
        <button type="button" class="auth-tab active" data-mode="login">Entrar</button>
        <button type="button" class="auth-tab" data-mode="register">Criar conta</button>
      </div>
      <form class="auth-form">
        <label for="auth-email">E-mail</label>
        <input id="auth-email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="voce@exemplo.com" required />
        <label for="auth-password">Senha</label>
        <input id="auth-password" name="password" type="password" autocomplete="current-password" minlength="10" maxlength="128" placeholder="Mínimo de 10 caracteres" required />
        <p class="auth-hint">Use pelo menos 10 caracteres. Guarde sua senha em local seguro.</p>
        <p class="auth-error" role="alert" aria-live="polite"></p>
        <button class="auth-submit" type="submit">Entrar</button>
      </form>
      <p class="auth-footnote">Protótipo em desenvolvimento · suas informações são usadas para salvar sua conta no jogo.</p>
    </div>`;
  root.append(screen);

  let mode: AuthMode = 'login';
  const form = screen.querySelector('form') as HTMLFormElement;
  const title = screen.querySelector('#auth-title') as HTMLElement;
  const submit = screen.querySelector('.auth-submit') as HTMLButtonElement;
  const password = screen.querySelector('#auth-password') as HTMLInputElement;
  const error = screen.querySelector('.auth-error') as HTMLElement;
  const tabs = [...screen.querySelectorAll<HTMLButtonElement>('.auth-tab')];

  const setMode = (next: AuthMode): void => {
    mode = next;
    tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === next));
    title.textContent = next === 'login' ? 'Entre no mundo' : 'Crie sua conta';
    submit.textContent = next === 'login' ? 'Entrar' : 'Criar conta';
    password.autocomplete = next === 'login' ? 'current-password' : 'new-password';
    error.textContent = '';
  };

  tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode as AuthMode)));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    const secret = String(data.get('password') ?? '');
    submit.disabled = true;
    submit.textContent = mode === 'login' ? 'Entrando…' : 'Criando conta…';
    error.textContent = '';
    try {
      await onSubmit(mode, email, secret);
    } catch (cause) {
      error.textContent = cause instanceof Error ? cause.message : 'Não foi possível concluir. Tente novamente.';
      submit.disabled = false;
      submit.textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
    }
  });
}
