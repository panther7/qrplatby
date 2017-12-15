

var init = function () {

    /* https://qr-platba.cz/pro-vyvojare/restful-api/
    accountPrefix 	STRING 	Předčíslí čísla účtu, na který se mají poslat prostředky.
    accountNumber 	STRING 	Číslo účtu, na který se mají poslat prostředky.
    bankCode 	STRING 	Kód banky účtu, na který se mají poslat prostředky.
    amount 	DOUBLE 	Částka platby.
    currency 	STRING 	Měna platby.
    vs 	STRING 	Variabilní symbol.
    ks 	STRING 	Konstantní symbol.
    ss 	STRING 	Specifický symbol.
    identifier 	STRING 	Interní ID platby.
    date 	STRING 	Datum splatnosti ve formátu ISO 8601 (krátky formát pro datum, tj. YYYY-mm-dd)
    message 	STRING 	Zpráva pro příjemce
    compress 	BOOLEAN 	Použít kompaktní formát (uppercase bez diakritiky). Výchozí hodnota: true.
    branding 	BOOLEAN 	Použít branding QR kódu (rámeček a nápis QR Platba). Výchozí hodnota: true.
    size 	INT 	Rozměr QR kódu v pixelech.
    */
    let ApiParams = ['accountPrefix', 'accountNumber', 'bankCode', 'amount', 'currency', 'vs', 'ks', 'ss', 'identifier', 'date', 'message', 'compress', 'branding', 'size'];

    class Storage {
        constructor (name) {
            this.storageName = name;
        }
        get () {
            let data = localStorage.getItem(this.storageName);
            try {
                return JSON.parse(data);
            } catch (e) {}
            return null;
        }
        set (data) {
            localStorage.setItem(this.storageName, typeof data == "string" ? data : JSON.stringify(data));
        }
        clear () {
            localStorage.removeItem(this.storageName);
        }
    }


    class Editor {
        constructor (selector, storageName) {
            this._elm = document.querySelector(selector);
            this._storage = new Storage(storageName);
            this._timer = null;

            let data = this._storage.get();
            if (data) this.set(data);
        }
        set (data) {
            this._elm.value = this._formatData(data);
            this._storage.set(this._elm.value);
        }
        get () {
            return this._elm.value;
        }
        clear () {
            this._elm.value = "";
            this._storage.clear();
        }
        getJSON () {
            try {
                return JSON.parse(this.get());
            } catch (e) {
                console.warn(e);
                return null;
            }
        }
        onChange (fn) {
            return this._elm.addEventListener("input", (evt) => {
                this._storage.set(evt.target.value);
                if (typeof fn == "function") fn(evt);
            });
        }
        _formatData (data) {
            if (typeof data == "string") {
                return data;
            } else {
                return JSON.stringify(data, null, 3);
            }
        }
    }


    class Renderer {
        constructor (selector) {
            this._elm = document.querySelector(selector);
        }
        render (data) {
            let parsed, a;
            try {
                parsed = JSON.parse(data);
            } catch (e) {
                return;
            }

            this._elm.innerHTML = "";

            a = Array.isArray(parsed) ? parsed : [parsed];
            a.forEach(d => this._elm.appendChild( this._createQR(d) ));
        }
        _createQR(data) {
            let src = "";
            let ApiUrl = "https://api.paylibo.com/paylibo/generator/czech/image";
            let searchParams = new URLSearchParams();

            ApiParams.forEach((p) => {
                if (typeof data[p] == "undefined") return;
                searchParams.set(p, data[p]);
            });

            src = new URL("?"+searchParams, ApiUrl);

            let template = `
                <div class="img"><img src="${src}"></div>
                <div class="title">${data.title}</div>
                <div class="price">${Number(data.amount).toLocaleString("cs", {style: "currency", currency: "CZK", minimumFractionDigits: 0})}</div>
            `;
            let elm = document.createElement("div");
            elm.insertAdjacentHTML("afterbegin", template);

            return elm;
        }
    }




    let moznosti = {
        "branding": false,
        "size": 250,
        "compress": false
    };
    let banka = {
        "accountNumber": 1142592018,
        "bankCode": 3030
    };
    let qrplatba = {
        "title": "Džusík",
        "amount": 15,
        "currency": "CZK",
        "vs": 666,
        "message": "dzusik"
    };


    let editor = new Editor("#editor", "qrdata");
    let editorForce = new Editor("#editor-force", "qrdata-force");
    let resetButton = document.querySelector("#reset");
    let downloadButton = document.querySelector("#download");
    let uploadButton = document.querySelector("#upload");
    let renderer = new Renderer("#result");

    if (!editor.get()) {
        editor.set([Object.assign({}, banka, moznosti, qrplatba)]);
    }
    editor.onChange((evt) => {
        renderer.render(editor.get());
    });

    if (!editorForce.get()) {
        editorForce.set(Object.assign({}, banka, moznosti));
    }

    editorForce.onChange((evt) => {
        let a;
        let ef_data = editorForce.getJSON();
        let e_data = editor.getJSON();

        if (!e_data || !ef_data) return;

        a = Array.isArray(e_data) ? e_data : [e_data];
        editor.set(
            a.map(d => {
                for (let p in ef_data) {
                    d[p] = ef_data[p];
                }
                return d;
            })
        );
        renderer.render(editor.get());
    });


    renderer.render(editor.get());


    resetButton.addEventListener("click", clear);
    downloadButton.addEventListener("click", download);
    uploadButton.addEventListener("change", upload);

    function upload (evt) {
        let fr = new FileReader();
        fr.onload = function (evt) { editor.set(evt.target.result); renderer.render(editor.get()); fr = null; };
        fr.readAsText(evt.target.files[0]);
    }

    function download () {
        let a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([editor.value], {
            type: "application/json;charset=utf-8;",
        }));
        a.download = "qrdata.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function clear () {
        editor.clear();
        editorForce.clear();
        location.reload();
    }

};




document.addEventListener("DOMContentLoaded", () => init());