module.exports = {
    "parser": "babel-eslint",
    "plugins": [
        "import"
    ],
    "env": {
        "es6": true,
        "node": true,
        "mocha": true
    },
    //"extends": "eslint:recommended",
    "extends": ["airbnb"],
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        "react/require-extension": "off",
        "strict": 0,
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-console": "off",
        "comma-dangle": "off",
        "no-use-before-define": 0, // Enable to define styles after using them in component.
        "generator-star-spacing": 0,
        "arrow-parens": [
          "error",
          "always"
        ],
        // eslint-plugin-import
        "import/no-unresolved": [2, {"commonjs": true}],
        "import/named": 2,
        "import/default": 2,
        "import/namespace": 2,
        "import/export": 2,
    },
    "settings": {
        "import/ignore": [
            "node_modules",
            "\\.json$"
        ],
        "import/parser": "babel-eslint",
            "import/resolve": {
                "extensions": [
                    ".js",
                    ".jsx",
                    ".json"
                ]
        }
    }
}
