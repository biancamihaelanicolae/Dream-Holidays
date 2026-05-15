const express = require("express");
const fs = require('fs');
const path = require("path");
const sass = require("sass");
const sharp = require("sharp");

app = express();
app.set("view engine", "ejs")

obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse/scss"),
    folderCss: path.join(__dirname, "resurse/css"),
    folderBackup: path.join(__dirname, "backup"),
}



console.log("Folder index.js", __dirname);//numele proiectului
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);

let vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"]
for (let folder of vect_foldere) {
    if (!fs.existsSync(path.join(__dirname, folder))) {
        fs.mkdirSync(path.join(__dirname, folder), { recursive: true });
    }
}

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

// app.get("/cale", function (req, res) {
//     res.send("Salut, <b > ai ajuns </b> pe calea /cale");
//     console.log("Am primit o cerere GET pe /cale");
// });

app.get("/despre", function (req, res) {
    res.render("pagini/despre");
});

// app.get("/cale2", function (req, res) {
//     res.write("ceva\n");
//     res.write("altceva");
//     res.end();
// });

function initErori() {
    let continut = fs.readFileSync(path.join(__dirname, "resurse/json/erori.json")).toString("utf-8");
    let erori = obGlobal.obErori = JSON.parse(continut)
    let err_default = erori.eroare_default
    err_default.imagine = path.join(erori.cale_baza, err_default.imagine)
    for (let eroare of erori.info_erori) {
        eroare.imagine = path.join(erori.cale_baza, eroare.imagine)
    }

}
initErori()


function afisareEroare(res, identificator, titlu, text, imagine) {
    //TO DO cautam eroarea dupa identificator
    let eroare = obGlobal.obErori.info_erori.find((elem) =>
        elem.identificator == identificator
    )
    //daca sunt setate titlu, text, imagine, le folosim, 
    //altfel folosim cele din fisierul json pentru eroarea gasita
    //daca nu o gasim, afisam eroarea default
    let errDefault = obGlobal.obErori.eroare_default;
    if (eroare?.status)
        res.status(eroare.identificator)
    res.render("pagini/eroare", {
        imagine: imagine || eroare?.imagine || errDefault.imagine,
        titlu: titlu || eroare?.titlu || errDefault.titlu,
        text: text || eroare?.text || errDefault.text,
    });

}

//test
app.get("/eroare", function (req, res) {
    res.render("pagini/eroare", {
        imagine: obGlobal.obErori.eroare_default.imagine,
        titlu: obGlobal.obErori.eroare_default.titlu,
        text: obGlobal.obErori.eroare_default.text,
    });
});

app.get("/favicon.ico", function (req, res) {
    res.sendFile(path.join(__dirname, "resurse/imagini/favicon/favicon.ico"));
});

app.get(["/", "/index", "/home"], function (req, res) {
    res.render("pagini/index", {
        ip: req.ip
    });
});

function compileazaScss(caleScss, caleCss) {
    if (!caleCss) {

        let numeFisExt = path.basename(caleScss); // "folder1/folder2/a.scss" -> "a.scss"
        let numeFis = numeFisExt.split(".")[0]   /// "a.scss"  -> ["a","scss"]
        caleCss = numeFis + ".css"; // output: a.css
    }

    if (!path.isAbsolute(caleScss))
        caleScss = path.join(obGlobal.folderScss, caleScss)
    if (!path.isAbsolute(caleCss))
        caleCss = path.join(obGlobal.folderCss, caleCss)

    let caleBackup = path.join(obGlobal.folderBackup, "resurse/css");
    if (!fs.existsSync(caleBackup)) {
        fs.mkdirSync(caleBackup, { recursive: true })
    }

    // la acest punct avem cai absolute in caleScss si  caleCss

    let numeFisCss = path.basename(caleCss);
    if (fs.existsSync(caleCss)) {
        fs.copyFileSync(caleCss, path.join(obGlobal.folderBackup, "resurse/css", numeFisCss))// +(new Date()).getTime()
    }
    rez = sass.compile(caleScss, { "sourceMap": true });
    fs.writeFileSync(caleCss, rez.css)
}

//la pornirea serverului
vFisiere = fs.readdirSync(obGlobal.folderScss);
for (let numeFis of vFisiere) {
    if (path.extname(numeFis) == ".scss") {
        compileazaScss(numeFis);
    }
}


fs.watch(obGlobal.folderScss, function (eveniment, numeFis) {
    if (eveniment == "change" || eveniment == "rename") {
        let caleCompleta = path.join(obGlobal.folderScss, numeFis);
        if (fs.existsSync(caleCompleta)) {
            compileazaScss(caleCompleta);
        }
    }
});

app.get("/*pagina", function (req, res) {
    console.log("cale pagina", req.url);
    if (req.url.startsWith("/resurse") && path.extname(req.url) == "") {
        afisareEroare(res, 403);
        return;
    }

    if (path.extname(req.url) == ".ejs") {
        afisareEroare(res, 400);
        return;
    }

    try {
        res.render("pagini" + req.url, function (err, rezRandare) {
            if (err) {
                console.log("Eroare la randare", err);
                if (err.message && err.message.includes("Failed to lookup view")) {
                    afisareEroare(res, 404);
                }
                else {
                    afisareEroare(res);
                }
            }
            else {
                res.send(rezRandare);
            }
        });
    } catch (err) {
        if (err.message && err.message.includes("Cannot find module")) {
            afisareEroare(res, 404);
        }
        else {
            afisareEroare(res);
        }
    }
});

app.listen(8080);
console.log("Serverul a pornit!");