import type { AuthContext } from "../middleware/auth";

type FooterProps = {
  auth?: AuthContext;
};

export const Footer = ({ auth }: FooterProps) => {
  const currentYear = new Date().getFullYear();

  if (auth?.isAuthenticated) {
    return (
      <footer className="footer footer-center bg-base-300 text-base-content p-4 border-t border-base-content/10">
        <aside>
          <p>
            © {currentYear} ClickNPS. All rights reserved.{" "}
            <a href="/settings/support" className="link link-hover">
              Support
            </a>
          </p>
        </aside>
      </footer>
    );
  }

  return (
    <footer className="footer bg-base-300 text-base-content border-t border-base-content/10">
      <div className="container mx-auto px-4 sm:px-8 py-10">
        <div className="footer sm:footer-horizontal">
          <nav>
            <h6 className="footer-title">Product</h6>
            <a href="/" className="link link-hover">
              Home
            </a>
            <a href="/pricing" className="link link-hover">
              Pricing
            </a>
            <a href="/docs" className="link link-hover">
              Documentation
            </a>
          </nav>
          <nav>
            <h6 className="footer-title">Company</h6>
            <a href="/about" className="link link-hover">
              About
            </a>
            <a href="/contact" className="link link-hover">
              Contact
            </a>
            <a href="/blog" className="link link-hover">
              Blog
            </a>
          </nav>
          <nav>
            <h6 className="footer-title">Legal</h6>
            <a href="/terms" className="link link-hover">
              Terms of Service
            </a>
            <a href="/privacy" className="link link-hover">
              Privacy Policy
            </a>
          </nav>
          <nav>
            <h6 className="footer-title">Get Started</h6>
            <a href="/login" className="link link-hover">
              Log in
            </a>
            <a href="/signup" className="link link-hover">
              Sign up free
            </a>
          </nav>
        </div>
        <div className="footer footer-center mt-8 pt-8 border-t border-base-content/10">
          <aside>
            <p>© {currentYear} ClickNPS. All rights reserved.</p>
          </aside>
        </div>
      </div>
    </footer>
  );
};
