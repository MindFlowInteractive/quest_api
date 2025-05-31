declare module 'mjml' {
  interface MJMLParseResults {
    html: string;
    errors: any[];
  }

  const mjml2html: (mjml: string) => MJMLParseResults;
  export default mjml2html;
}
