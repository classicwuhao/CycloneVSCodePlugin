#!/bin/bash

echo "Cyclone/**
.vscode/**
.vscode-test/**
.gitignore
vsc-extension-quickstart.md" > .vscodeignore
vsce package --out "./Cyclone-ARM.vsix"
echo "CycloneARM/**
.vscode/**
.vscode-test/**
.gitignore
vsc-extension-quickstart.md" > .vscodeignore
vsce package --out "./Cyclone-x64.vsix"


