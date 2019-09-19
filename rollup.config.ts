export default {
  input: 'dist/es/index.js',
  output: {
    name: 'SplitTime',
    file: './dist/split_time.js',
    format: 'umd',
    exports: 'named',
    sourcemap: true
  },
  watch: {
    include: 'dist/es/**'
  }
}
