import {TeX} from "mathjax3/input/tex.js";
import {MathML} from "mathjax3/input/mathml.js";
import {CHTML} from "mathjax3/output/chtml.js";
import {HTMLMathItem} from "mathjax3/handlers/html/HTMLMathItem.js";
import {HTMLDocument} from "mathjax3/handlers/html/HTMLDocument.js";
import {handleRetriesFor} from "mathjax3/util/Retries.js";
import {browserAdaptor} from "mathjax3/adaptors/browserAdaptor.js";

import {ConfigurationHandler} from 'mathjax3/input/tex/Configuration.js';
import {SerializedMmlVisitor as MmlVisitor} from '../mathjax3/core/MmlTree/SerializedMmlVisitor.js';

import 'mathjax3/input/tex/base/BaseConfiguration.js';
import 'mathjax3/input/tex/ams/AmsConfiguration.js';
import 'mathjax3/input/tex/noundefined/NoUndefinedConfiguration.js';
import 'mathjax3/input/tex/boldsymbol/BoldsymbolConfiguration.js';
import 'mathjax3/input/tex/newcommand/NewcommandConfiguration.js';

import {Explorer, LiveRegion} from 'mathjax3/a11y/Explorer.js';


let tex = new TeX();
let mathml = new MathML();
let chtml = new CHTML();
let visitor = new MmlVisitor();

let doc = new HTMLDocument(document, browserAdaptor(), {InputJax: mathml, OutputJax: chtml});
document.head.appendChild(chtml.styleSheet(doc));
let toMml = (node => visitor.visitTree(node, window.document));


const Lab = window.Lab = {
  tex: document.getElementById('tex'),
  output: document.getElementById('output'),
  display: true,
  packages: {},
  old: null,
  new: null,
  region: new LiveRegion(doc),
  inner: null,
  
  Typeset() {
    this.output.innerHTML = '';
    let tex = new TeX({packages: this.getPackages()});
    let text = this.output.appendChild(document.createTextNode(''));

    let value = this.tex.value;
    let math = new HTMLMathItem(value, tex);
    math.setMetrics(16,8,16*20,100000,1);
    math.display = this.display;
    math.start = {node: text, n: 0, delim: ''};
    math.end = {node: text, n: 0, delim: ''};
    this.jax = math;

    handleRetriesFor(function () {
      math.compile();
      math.root.setTeXclass();
      let mml = toMml(math.root);
      // TODO: properly import SRE or move this into the a11y document.
      let enriched = SRE.toEnriched(mml);
      let math2 = new HTMLMathItem(enriched.outerHTML, mathml);      
      math2.compile();
      math2.typeset(doc);
      math.typesetRoot = math2.typesetRoot;
      Lab.new = toMml(math2.root);
    }).then(() => {Lab.Update(math.typesetRoot.outerHTML);
                   new Explorer(doc, Lab.region, Lab.output.childNodes[0], Lab.new);}
           )
      .catch(err => {console.log("Error: " + err.message); console.log(err.stack)});
  },

  Keep() {
    window.location.search = "?" + [
      (this.display ? 1 : 0) + encodeURIComponent(this.tex.value)].
      concat(this.getPackages()).join(';');
  },
  
  Update(html) {
    this.output.innerHTML = html;
  },

  setPackages(packages) {
    for (let pack of packages) {
      let node = document.getElementById('package-' + pack);
      if (node) {
        node.checked = true;
      }
    }
  },

  getPackages() {
    let result = [];
    for (let key in this.packages) {
      if (document.getElementById(this.packages[key]).checked) {
        result.push(key);
      }
    }
    return result;
  },
  
  Packages() {
    let div = document.getElementById('package');
    for (let key of ConfigurationHandler.keys()) {
      if (key === 'empty' || key === 'extension') continue;
      let checkbox = document.createElement('input');
      checkbox.type = "checkbox";
      checkbox.name = key;
      checkbox.value = key;
      checkbox.id = 'package-' + key;
      if (key === 'base') checkbox.checked = true;
      let label = document.createElement('label');
      label.htmlFor = 'package-' + key;
      label.appendChild(document.createTextNode(key[0].toUpperCase() + key.slice(1)));
      checkbox.appendChild(label);
      div.appendChild(checkbox);
      div.appendChild(label);
      this.packages[key] = 'package-' + key;
    }
  },
  
  setDisplay(checked) {
    this.display = checked;
    this.Typeset();
  },
  
  checkKey: function (textarea, event) {
    if (!event) event = window.event;
    var code = event.which || event.keyCode;
    if ((event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) &&
        (code === 13 || code === 10)) {
      if (event.preventDefault) event.preventDefault();
      event.returnValue = false;
      this.Typeset();
    }
  }

}

Lab.Packages();
if (window.location.search !== "") {
  let [expr, ...rest] = decodeURIComponent(window.location.search).split(';');
  Lab.tex.value = expr.substr(2); // decodeURIComponent(expr.substr(2));
  Lab.display = expr.substr(1,1) === '1';
  document.getElementById('display').checked = Lab.display;
  Lab.setPackages(rest);
  Lab.Typeset();
}
