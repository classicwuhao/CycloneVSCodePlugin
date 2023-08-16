#!/bin/bash

echo "Cyclone/**
node_modules/**
.vscode/**
.vscode-test/**
.gitignore
vsc-extension-quickstart.md" > .vscodeignore
vsce package --out "./Cyclone-ARM.vsix"
echo "CycloneARM/**
node_modules/**
.vscode/**
.vscode-test/**
.gitignore
vsc-extension-quickstart.md" > .vscodeignore
vsce package --out "./Cyclone-x64.vsix"


