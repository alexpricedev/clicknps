import { Layout } from "@server/components/layouts";
import type { AuthContext } from "@server/middleware/auth";

type AboutProps = {
  auth?: AuthContext;
  csrfToken?: string | null;
};

export const About = ({ auth, csrfToken }: AboutProps) => (
  <Layout title="About" name="about" auth={auth} csrfToken={csrfToken}>
    <h1>About Page</h1>
    <section className="card">
      <p>
        The background of this page is different becuase of the auto-mounting
        client JS for this specific page.
      </p>
      <p>
        The title colour is also different because of the page-by-page custom
        CSS.
      </p>
      <p>And this is a custom web component! 👇</p>
    </section>
  </Layout>
);
